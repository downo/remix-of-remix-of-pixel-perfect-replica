<?php
// TUHK self-hosted game API (accounts, saves, leaderboard, chat, clans, market, weekly).
require_once __DIR__ . '/db.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

class ApiError extends Exception {}
function out($data, int $code = 200) { http_response_code($code); echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400) { http_response_code($code); echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('POST only', 405);
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) fail('Bad request');

// ---------- auth ----------
function user_json(array $u): array { return ['id' => $u['id'], 'email' => $u['username'], 'user_metadata' => ['username' => $u['username']]]; }
function start_session(array $u) {
  $tok = bin2hex(random_bytes(32));
  db()->prepare('INSERT INTO sessions(token_hash,user_id,created_at) VALUES (?,?,?)')->execute([hash('sha256', $tok), $u['id'], now()]);
  out(['access_token' => $tok, 'user' => user_json($u)]);
}
function current_user(): ?array {
  $tok = $_SERVER['HTTP_X_TUHK_TOKEN'] ?? '';
  if (!$tok) return null;
  $st = db()->prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?');
  $st->execute([hash('sha256', $tok)]);
  return $st->fetch() ?: null;
}
function need_user(): array { $u = current_user(); if (!$u) fail('Pole sisse logitud', 401); return $u; }
function my_clan(string $uid): ?string { $st = db()->prepare('SELECT clan_id FROM clan_members WHERE user_id=?'); $st->execute([$uid]); $c = $st->fetchColumn(); return $c ?: null; }

// ---------- generic table access ----------
const TABLES = [
  'profiles'       => ['cols' => ['id','username','score','level','day','updated_at'], 'read' => 'public', 'owner' => 'id', 'pk' => ['id'], 'write' => 'upsert'],
  'saves'          => ['cols' => ['user_id','state','updated_at'], 'read' => 'own', 'owner' => 'user_id', 'pk' => ['user_id'], 'write' => 'upsert'],
  'weekly_contrib' => ['cols' => ['week','user_id','username','amount','updated_at'], 'read' => 'public', 'owner' => 'user_id', 'pk' => ['week','user_id'], 'write' => 'upsert'],
  'season_contrib' => ['cols' => ['season','user_id','username','amount','updated_at'], 'read' => 'public', 'owner' => 'user_id', 'pk' => ['season','user_id'], 'write' => 'upsert'],
  'territories'    => ['cols' => ['id','owner','owner_name','captured_at','last_attack_at'], 'read' => 'public'],
  'clans'          => ['cols' => ['id','name','created_by','created_at'], 'read' => 'public'],
  'clan_members'   => ['cols' => ['user_id','clan_id','joined_at'], 'read' => 'public'],
  'clan_stash'     => ['cols' => ['clan_id','item','qty'], 'read' => 'clan'],
  'market_offers'  => ['cols' => ['id','seller_id','buyer_id','give_item','give_qty','want_item','want_qty','status','seller_claimed','created_at'], 'read' => 'public'],
  'player_quests'  => ['cols' => ['id','poster_id','title','want_item','want_qty','reward_item','reward_qty','status','helper_id','created_at'], 'read' => 'public'],
  'gifts'          => ['cols' => ['id','from_id','from_name','to_id','item','qty','claimed','created_at'], 'read' => 'gift'],
  'clan_wars'      => ['cols' => ['id','attacker','defender','attacker_name','defender_name','won','loot','created_at'], 'read' => 'public'],
  'chat_messages'  => ['cols' => ['id','clan_id','user_id','username','body','created_at'], 'read' => 'chat', 'owner' => 'user_id', 'write' => 'insert'],
];
const INT_COLS = ['score','level','day','amount','qty','give_qty','want_qty','reward_qty','id_int'];

function cast_row(array $r): array {
  foreach ($r as $k => $v) {
    if ($v === null) continue;
    if (in_array($k, INT_COLS, true)) $r[$k] = (int)$v;
    if (in_array($k, ['seller_claimed','claimed','won'], true)) $r[$k] = (bool)$v;
    if ($k === 'state') $r[$k] = json_decode($v, true);
    if ($k === 'id' && is_int($v)) $r[$k] = (string)$v;
  }
  return $r;
}

function col_ok(array $t, $c): string { if (!is_string($c) || !in_array($c, $t['cols'], true)) throw new ApiError('Bad column'); return $c; }

function where_sql(array $t, array $q, array &$args): string {
  $w = [];
  foreach ($q['filters'] ?? [] as $f) {
    [$c, $op, $v] = $f + [null, null, null]; $c = col_ok($t, $c);
    if ($op === 'eq') { $w[] = "$c = ?"; $args[] = $v; }
    elseif ($op === 'is') { if ($v !== null) throw new ApiError('Bad filter'); $w[] = "$c IS NULL"; }
    elseif ($op === 'in') { $v = array_values(array_slice((array)$v, 0, 500)); if (!$v) { $w[] = '0'; continue; } $w[] = "$c IN (" . implode(',', array_fill(0, count($v), '?')) . ')'; array_push($args, ...$v); }
    else throw new ApiError('Bad filter');
  }
  if (!empty($q['or'])) {
    $parts = [];
    foreach (explode(',', (string)$q['or']) as $p) {
      $bits = explode('.', $p, 3); if (count($bits) !== 3 || $bits[1] !== 'eq') throw new ApiError('Bad filter');
      $parts[] = col_ok($t, $bits[0]) . ' = ?'; $args[] = $bits[2];
    }
    $w[] = '(' . implode(' OR ', $parts) . ')';
  }
  return $w ? implode(' AND ', $w) : '1';
}

function run_query(array $q) {
  $name = (string)($q['table'] ?? '');
  if (!isset(TABLES[$name])) throw new ApiError('Bad table');
  $t = TABLES[$name]; $op = $q['op'] ?? 'select';
  $u = ($t['read'] === 'public' && $op === 'select') ? current_user() : need_user();

  if ($op === 'select') {
    $args = [];
    $cols = ($q['cols'] ?? '*') === '*' ? $t['cols'] : array_map(fn($c) => col_ok($t, trim($c)), explode(',', (string)$q['cols']));
    $where = where_sql($t, $q, $args);
    if ($t['read'] === 'own') { $where .= " AND {$t['owner']} = ?"; $args[] = $u['id']; }
    if ($t['read'] === 'clan') { $where .= ' AND clan_id = ?'; $args[] = my_clan($u['id']); }
    if ($t['read'] === 'gift') { $where .= ' AND (to_id = ? OR from_id = ?)'; $args[] = $u['id']; $args[] = $u['id']; }
    if ($t['read'] === 'chat') { $where .= ' AND (clan_id IS NULL OR clan_id = ?)'; $args[] = my_clan($u['id']); }
    $sql = 'SELECT ' . implode(',', $cols) . " FROM $name WHERE $where";
    if (!empty($q['order'])) { $sql .= ' ORDER BY ' . col_ok($t, $q['order'][0]) . (($q['order'][1] ?? '') === 'desc' ? ' DESC' : ' ASC'); }
    $sql .= ' LIMIT ' . max(1, min(500, (int)($q['limit'] ?? 500)));
    $st = db()->prepare($sql); $st->execute($args);
    $rows = array_map('cast_row', $st->fetchAll());
    return !empty($q['single']) ? ($rows[0] ?? null) : $rows;
  }

  if ($op === 'upsert' && ($t['write'] ?? '') === 'upsert') {
    $v = is_array($q['values'] ?? null) ? $q['values'] : throw new ApiError('Bad values');
    $v[$t['owner']] = $u['id'];
    if (array_key_exists('username', $v)) $v['username'] = $u['username'];
    if (array_key_exists('state', $v)) { $v['state'] = json_encode($v['state'], JSON_UNESCAPED_UNICODE); if (strlen($v['state']) > 2000000) throw new ApiError('Salvestus liiga suur'); }
    foreach (['score','level','day','amount'] as $n) if (array_key_exists($n, $v)) $v[$n] = max(0, min(10000000, (int)$v[$n]));
    if (array_key_exists('week', $v)) $v['week'] = substr((string)$v['week'], 0, 20);
    $v['updated_at'] = now();
    $cols = array_map(fn($c) => col_ok($t, $c), array_keys($v));
    // UPDATE-then-INSERT instead of ON CONFLICT: older SQLite builds on shared hosts lack UPSERT.
    $set = array_values(array_diff($cols, $t['pk']));
    $st = db()->prepare("UPDATE $name SET " . implode(',', array_map(fn($c) => "$c=?", $set)) . ' WHERE ' . implode(' AND ', array_map(fn($c) => "$c=?", $t['pk'])));
    $st->execute(array_merge(array_map(fn($c) => $v[$c], $set), array_map(fn($c) => $v[$c] ?? null, $t['pk'])));
    if ($st->rowCount() === 0) db()->prepare("INSERT INTO $name(" . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')')->execute(array_values($v));
    return null;
  }

  if ($name === 'chat_messages' && $op === 'insert') {
    $v = $q['values'] ?? [];
    $body = trim(mb_substr((string)($v['body'] ?? ''), 0, 300)); if ($body === '') throw new ApiError('Tühi sõnum');
    $clan = $v['clan_id'] ?? null;
    if ($clan !== null && $clan !== my_clan($u['id'])) throw new ApiError('Pole selle klanni liige');
    $last = db()->prepare('SELECT created_at FROM chat_messages WHERE user_id=? ORDER BY id DESC LIMIT 1'); $last->execute([$u['id']]);
    $lt = $last->fetchColumn(); if ($lt && time() - strtotime($lt) < 1) throw new ApiError('Liiga kiiresti');
    db()->prepare('INSERT INTO chat_messages(clan_id,user_id,username,body,created_at) VALUES (?,?,?,?,?)')->execute([$clan, $u['id'], $u['username'], $body, now()]);
    $id = (int)db()->lastInsertId();
    db()->exec('DELETE FROM chat_messages WHERE id < ' . ($id - 5000));
    $st = db()->prepare('SELECT * FROM chat_messages WHERE id=?'); $st->execute([$id]);
    return cast_row($st->fetch());
  }

  if ($name === 'chat_messages' && $op === 'delete') {
    $args = []; $where = where_sql($t, $q, $args);
    $args[] = $u['id'];
    db()->prepare("DELETE FROM chat_messages WHERE $where AND user_id = ?")->execute($args);
    return null;
  }
  throw new ApiError('Not allowed');
}

// ---------- server-side actions (clans, stash, market) ----------
function valid_item($i): bool { return is_string($i) && preg_match('/^[a-z]{2,20}$/', $i); }

function run_rpc(string $fn, array $a) {
  $u = need_user(); $uid = $u['id']; $pdo = db();
  $pdo->beginTransaction();
  try {
    $r = null;
    switch ($fn) {
      case 'create_clan': {
        $name = trim(mb_substr((string)($a['_name'] ?? ''), 0, 30));
        if (mb_strlen($name) < 2) throw new ApiError('Nimi liiga lühike');
        if (my_clan($uid)) throw new ApiError('Oled juba klannis');
        $st = $pdo->prepare('SELECT 1 FROM clans WHERE name=?'); $st->execute([$name]); if ($st->fetch()) throw new ApiError('Selline klann on juba olemas');
        $r = new_id();
        $pdo->prepare('INSERT INTO clans(id,name,created_by,created_at) VALUES (?,?,?,?)')->execute([$r, $name, $uid, now()]);
        $pdo->prepare('INSERT INTO clan_members(user_id,clan_id,joined_at) VALUES (?,?,?)')->execute([$uid, $r, now()]);
        break;
      }
      case 'join_clan': {
        if (my_clan($uid)) throw new ApiError('Oled juba klannis');
        $st = $pdo->prepare('SELECT 1 FROM clans WHERE id=?'); $st->execute([(string)($a['_clan'] ?? '')]); if (!$st->fetch()) throw new ApiError('Klanni pole');
        $pdo->prepare('INSERT INTO clan_members(user_id,clan_id,joined_at) VALUES (?,?,?)')->execute([$uid, $a['_clan'], now()]);
        break;
      }
      case 'leave_clan': {
        $c = my_clan($uid);
        $pdo->prepare('DELETE FROM clan_members WHERE user_id=?')->execute([$uid]);
        if ($c) { $st = $pdo->prepare('SELECT 1 FROM clan_members WHERE clan_id=?'); $st->execute([$c]); if (!$st->fetch()) $pdo->prepare('DELETE FROM clans WHERE id=?')->execute([$c]); }
        break;
      }
      case 'stash_deposit': {
        $c = my_clan($uid); $item = $a['_item'] ?? ''; $q = (int)($a['_qty'] ?? 0);
        if (!$c) throw new ApiError('Pole klannis');
        if (!valid_item($item) || $q < 1 || $q > 999) throw new ApiError('Vigane');
        // UPDATE-then-INSERT instead of ON CONFLICT: older SQLite builds on shared hosts lack UPSERT.
        $st = $pdo->prepare('UPDATE clan_stash SET qty = qty + ? WHERE clan_id = ? AND item = ?'); $st->execute([$q, $c, $item]);
        if ($st->rowCount() === 0) $pdo->prepare('INSERT INTO clan_stash(clan_id,item,qty) VALUES (?,?,?)')->execute([$c, $item, $q]);
        break;
      }
      case 'stash_withdraw': {
        $c = my_clan($uid); $q = (int)($a['_qty'] ?? 0);
        if (!$c || $q < 1) { $r = false; break; }
        $st = $pdo->prepare('UPDATE clan_stash SET qty = qty - ? WHERE clan_id=? AND item=? AND qty >= ?'); $st->execute([$q, $c, (string)($a['_item'] ?? ''), $q]);
        $r = $st->rowCount() > 0;
        $pdo->prepare('DELETE FROM clan_stash WHERE clan_id=? AND qty <= 0')->execute([$c]);
        break;
      }
      case 'market_post': {
        $g = $a['_give'] ?? ''; $w = $a['_want'] ?? ''; $gq = (int)($a['_gq'] ?? 0); $wq = (int)($a['_wq'] ?? 0);
        if (!valid_item($g) || !valid_item($w) || $gq < 1 || $gq > 999 || $wq < 1 || $wq > 999) throw new ApiError('Vigane pakkumine');
        $st = $pdo->prepare("SELECT COUNT(*) FROM market_offers WHERE seller_id=? AND status='open'"); $st->execute([$uid]);
        if ((int)$st->fetchColumn() >= 10) throw new ApiError('Liiga palju avatud pakkumisi');
        $r = new_id();
        $pdo->prepare('INSERT INTO market_offers(id,seller_id,give_item,give_qty,want_item,want_qty,created_at) VALUES (?,?,?,?,?,?,?)')->execute([$r, $uid, $g, $gq, $w, $wq, now()]);
        break;
      }
      case 'market_accept': {
        $st = $pdo->prepare("UPDATE market_offers SET status='taken', buyer_id=? WHERE id=? AND status='open' AND seller_id <> ?"); $st->execute([$uid, (string)($a['_offer'] ?? ''), $uid]);
        $r = $st->rowCount() > 0; break;
      }
      case 'market_cancel': {
        $st = $pdo->prepare("UPDATE market_offers SET status='cancelled' WHERE id=? AND status='open' AND seller_id=?"); $st->execute([(string)($a['_offer'] ?? ''), $uid]);
        $r = $st->rowCount() > 0; break;
      }
      case 'market_claim': {
        $st = $pdo->prepare("SELECT id, want_item AS item, want_qty AS qty FROM market_offers WHERE seller_id=? AND status='taken' AND seller_claimed=0"); $st->execute([$uid]);
        $rows = $st->fetchAll();
        if ($rows) $pdo->prepare("UPDATE market_offers SET seller_claimed=1 WHERE seller_id=? AND status='taken' AND seller_claimed=0")->execute([$uid]);
        $r = array_map(fn($x) => ['item' => $x['item'], 'qty' => (int)$x['qty']], $rows);
        break;
      }
      case 'gift_send': {
        $item = $a['_item'] ?? ''; $q = (int)($a['_qty'] ?? 0); $to = trim((string)($a['_to'] ?? ''));
        if (!valid_item($item) || $q < 1 || $q > 999) throw new ApiError('Vigane kingitus');
        $st = $pdo->prepare('SELECT id FROM users WHERE username = ?'); $st->execute([$to]); $tid = $st->fetchColumn();
        if (!$tid) throw new ApiError('Sellist mängijat pole');
        if ($tid === $uid) throw new ApiError('Endale ei saa kinkida');
        $st = $pdo->prepare('SELECT COUNT(*) FROM gifts WHERE from_id=? AND created_at > ?'); $st->execute([$uid, gmdate('Y-m-d\\TH:i:s\\Z', time() - 3600)]);
        if ((int)$st->fetchColumn() >= 20) throw new ApiError('Liiga palju kingitusi');
        $pdo->prepare('INSERT INTO gifts(id,from_id,from_name,to_id,item,qty,created_at) VALUES (?,?,?,?,?,?,?)')->execute([new_id(), $uid, $u['username'], $tid, $item, $q, now()]);
        break;
      }
      case 'gift_claim': {
        $st = $pdo->prepare('SELECT item, qty, from_name FROM gifts WHERE to_id=? AND claimed=0'); $st->execute([$uid]);
        $r = array_map(fn($x) => ['item' => $x['item'], 'qty' => (int)$x['qty'], 'from_name' => $x['from_name']], $st->fetchAll());
        $pdo->prepare('UPDATE gifts SET claimed=1 WHERE to_id=? AND claimed=0')->execute([$uid]);
        break;
      }
      case 'clan_raid': {
        $mine = my_clan($uid); $tg = (string)($a['_target'] ?? '');
        if (!$mine) throw new ApiError('Pole klannis');
        if ($mine === $tg) throw new ApiError('Oma klanni ei saa rünnata');
        $st = $pdo->prepare('SELECT name FROM clans WHERE id=?'); $st->execute([$tg]); $dn = $st->fetchColumn(); if (!$dn) throw new ApiError('Klanni pole');
        $since = gmdate('Y-m-d\\TH:i:s\\Z', time() - 3600);
        $st = $pdo->prepare('SELECT 1 FROM clan_wars WHERE attacker=? AND created_at > ?'); $st->execute([$mine, $since]); if ($st->fetch()) throw new ApiError('Teie klann ründas hiljuti. Oota tund.');
        $st = $pdo->prepare('SELECT 1 FROM clan_wars WHERE defender=? AND created_at > ?'); $st->execute([$tg, $since]); if ($st->fetch()) throw new ApiError('Seda klanni rünnati hiljuti.');
        $pw = function ($c) use ($pdo) { $st = $pdo->prepare('SELECT COALESCE(SUM(p.score),0) FROM clan_members m JOIN profiles p ON p.id=m.user_id WHERE m.clan_id=?'); $st->execute([$c]); return (float)$st->fetchColumn() + 10; };
        $rf = fn() => 0.7 + mt_rand() / mt_getrandmax() * 0.6;
        $win = $pw($mine) * $rf() > $pw($tg) * $rf();
        [$w, $l] = $win ? [$mine, $tg] : [$tg, $mine];
        $st = $pdo->prepare('SELECT item, qty FROM clan_stash WHERE clan_id=?'); $st->execute([$l]); $got = [];
        foreach ($st->fetchAll() as $x) {
          $n = intdiv((int)$x['qty'], 5); if ($n < 1) continue;
          $pdo->prepare('UPDATE clan_stash SET qty = qty - ? WHERE clan_id=? AND item=?')->execute([$n, $l, $x['item']]);
          $up = $pdo->prepare('UPDATE clan_stash SET qty = qty + ? WHERE clan_id=? AND item=?'); $up->execute([$n, $w, $x['item']]);
          if ($up->rowCount() === 0) $pdo->prepare('INSERT INTO clan_stash(clan_id,item,qty) VALUES (?,?,?)')->execute([$w, $x['item'], $n]);
          $got[] = $x['item'] . ':' . $n;
        }
        $pdo->prepare('DELETE FROM clan_stash WHERE clan_id=? AND qty <= 0')->execute([$l]);
        $st = $pdo->prepare('SELECT name FROM clans WHERE id=?'); $st->execute([$mine]); $an = $st->fetchColumn();
        $pdo->prepare('INSERT INTO clan_wars(id,attacker,defender,attacker_name,defender_name,won,loot,created_at) VALUES (?,?,?,?,?,?,?,?)')->execute([new_id(), $mine, $tg, $an, $dn, $win ? 1 : 0, implode(' ', $got), now()]);
        $r = ['won' => $win, 'loot' => implode(' ', $got)];
        break;
      }
      case 'claim_territory': {
        $mine = my_clan($uid); $id = (string)($a['_id'] ?? '');
        if (!$mine) throw new ApiError('Pole klannis');
        $st = $pdo->prepare('SELECT * FROM territories WHERE id=?'); $st->execute([$id]); $t = $st->fetch();
        if (!$t) throw new ApiError('Sellist ala pole');
        if ($t['owner'] === $mine) throw new ApiError('See ala on juba teie oma');
        if ($t['last_attack_at'] && $t['last_attack_at'] > gmdate('Y-m-d\\TH:i:s\\Z', time() - 1800)) throw new ApiError('Seda ala rünnati hiljuti. Oota pool tundi.');
        $st = $pdo->prepare('SELECT name FROM clans WHERE id=?'); $st->execute([$mine]); $nm = $st->fetchColumn();
        $pw = function ($c) use ($pdo) { $st = $pdo->prepare('SELECT COALESCE(SUM(p.score),0) FROM clan_members m JOIN profiles p ON p.id=m.user_id WHERE m.clan_id=?'); $st->execute([$c]); return (float)$st->fetchColumn() + 10; };
        $rf = fn() => 0.7 + mt_rand() / mt_getrandmax() * 0.6;
        $st = $pdo->prepare('SELECT 1 FROM clans WHERE id=?'); $st->execute([(string)$t['owner']]);
        $win = !$t['owner'] || !$st->fetch() || $pw($mine) * $rf() > $pw($t['owner']) * 1.15 * $rf();
        if ($win) $pdo->prepare('UPDATE territories SET owner=?, owner_name=?, captured_at=?, last_attack_at=? WHERE id=?')->execute([$mine, $nm, now(), now(), $id]);
        else $pdo->prepare('UPDATE territories SET last_attack_at=? WHERE id=?')->execute([now(), $id]);
        $r = ['won' => $win];
        break;
      }
      case 'quest_post': {
        $t = trim((string)($a['_title'] ?? '')); $w = $a['_want'] ?? ''; $g = $a['_reward'] ?? ''; $wq = (int)($a['_wq'] ?? 0); $rq = (int)($a['_rq'] ?? 0);
        if (!valid_item($w) || !valid_item($g) || $wq < 1 || $wq > 999 || $rq < 1 || $rq > 999 || mb_strlen($t) < 2 || mb_strlen($t) > 80) throw new ApiError('Vigane tellimus');
        $st = $pdo->prepare("SELECT COUNT(*) FROM player_quests WHERE poster_id=? AND status='open'"); $st->execute([$uid]);
        if ((int)$st->fetchColumn() >= 5) throw new ApiError('too many quests');
        $r = new_id();
        $pdo->prepare('INSERT INTO player_quests(id,poster_id,title,want_item,want_qty,reward_item,reward_qty,created_at) VALUES (?,?,?,?,?,?,?,?)')->execute([$r, $uid, $t, $w, $wq, $g, $rq, now()]);
        break;
      }
      case 'quest_fulfill': {
        $st = $pdo->prepare("UPDATE player_quests SET status='done', helper_id=? WHERE id=? AND status='open' AND poster_id <> ?"); $st->execute([$uid, (string)($a['_quest'] ?? ''), $uid]);
        $r = $st->rowCount() > 0; break;
      }
      case 'quest_cancel': {
        $st = $pdo->prepare("UPDATE player_quests SET status='cancelled' WHERE id=? AND status='open' AND poster_id=?"); $st->execute([(string)($a['_quest'] ?? ''), $uid]);
        $r = $st->rowCount() > 0; break;
      }
      case 'quest_claim': {
        $st = $pdo->prepare("SELECT want_item AS item, want_qty AS qty FROM player_quests WHERE poster_id=? AND status='done' AND poster_claimed=0"); $st->execute([$uid]);
        $rows = $st->fetchAll();
        if ($rows) $pdo->prepare("UPDATE player_quests SET poster_claimed=1 WHERE poster_id=? AND status='done' AND poster_claimed=0")->execute([$uid]);
        $r = array_map(fn($x) => ['item' => $x['item'], 'qty' => (int)$x['qty']], $rows);
        break;
      }
      default: throw new ApiError('Unknown function');
    }
    $pdo->commit();
    return $r;
  } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
}

$action = $in['action'] ?? '';
try {
switch ($action) {
  case 'register': {
    $name = trim((string)($in['username'] ?? '')); $pw = (string)($in['password'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_.\-]{3,24}$/', $name)) fail('Kasutajanimi: 3–24 tähte, numbrit või _ . -');
    if (strlen($pw) < 6 || strlen($pw) > 200) fail('Parool peab olema vähemalt 6 märki');
    $st = db()->prepare('SELECT 1 FROM users WHERE username=?'); $st->execute([$name]);
    if ($st->fetch()) fail('See kasutajanimi on juba võetud');
    $u = ['id' => new_id(), 'username' => $name];
    db()->prepare('INSERT INTO users(id,username,pass_hash,created_at) VALUES (?,?,?,?)')->execute([$u['id'], $name, password_hash($pw, PASSWORD_DEFAULT), now()]);
    start_session($u);
  }
  case 'login': {
    $st = db()->prepare('SELECT * FROM users WHERE username=?'); $st->execute([trim((string)($in['username'] ?? ''))]);
    $u = $st->fetch();
    if (!$u || !password_verify((string)($in['password'] ?? ''), $u['pass_hash'])) { usleep(800000); fail('Vale kasutajanimi või parool'); }
    start_session($u);
  }
  case 'logout': {
    $tok = $_SERVER['HTTP_X_TUHK_TOKEN'] ?? '';
    if ($tok) db()->prepare('DELETE FROM sessions WHERE token_hash=?')->execute([hash('sha256', $tok)]);
    out(true);
  }
  case 'change_password': {
    $u = need_user(); $pw = (string)($in['password'] ?? '');
    if (strlen($pw) < 6) fail('Parool peab olema vähemalt 6 märki');
    db()->prepare('UPDATE users SET pass_hash=? WHERE id=?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
    out(true);
  }
  case 'chat_since': {
    $u = need_user(); $clan = my_clan($u['id']); $after = (int)($in['after'] ?? -1);
    $max = (int)db()->query('SELECT COALESCE(MAX(id),0) FROM chat_messages')->fetchColumn();
    $rows = [];
    if ($after >= 0) {
      $st = db()->prepare('SELECT * FROM chat_messages WHERE id > ? AND (clan_id IS NULL OR clan_id = ?) ORDER BY id LIMIT 100');
      $st->execute([$after, $clan]); $rows = array_map('cast_row', $st->fetchAll());
    }
    out(['max' => $max, 'rows' => $rows]);
  }
  case 'query': out(run_query(is_array($in['q'] ?? null) ? $in['q'] : fail('Bad query')));
  case 'rpc': out(run_rpc((string)($in['fn'] ?? ''), is_array($in['args'] ?? null) ? $in['args'] : []));
  default: fail('Unknown action');
}
} catch (ApiError $e) { fail($e->getMessage()); }
  catch (Throwable $e) { error_log('tuhk api: ' . $e->getMessage()); fail('Serveri viga', 500); }

