<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dir = dirname(DB_PATH);
  if (!is_dir($dir)) @mkdir($dir, 0770, true);
  $pdo = new PDO('sqlite:' . DB_PATH, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, pass_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, day INTEGER NOT NULL DEFAULT 1, updated_at TEXT);
CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, state TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS weekly_contrib (week TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, updated_at TEXT, PRIMARY KEY (week, user_id));
CREATE TABLE IF NOT EXISTS season_contrib (season TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 0, updated_at TEXT, PRIMARY KEY (season, user_id));
CREATE TABLE IF NOT EXISTS territories (id TEXT PRIMARY KEY, owner TEXT, owner_name TEXT, captured_at TEXT, last_attack_at TEXT);
INSERT OR IGNORE INTO territories(id) VALUES ('t_mine'),('t_dam'),('t_tower'),('t_depot'),('t_crater');
CREATE TABLE IF NOT EXISTS clans (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_by TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clan_members (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE, joined_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clan_stash (clan_id TEXT NOT NULL REFERENCES clans(id) ON DELETE CASCADE, item TEXT NOT NULL, qty INTEGER NOT NULL, PRIMARY KEY (clan_id, item));
CREATE TABLE IF NOT EXISTS player_quests (id TEXT PRIMARY KEY, poster_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, want_item TEXT NOT NULL, want_qty INTEGER NOT NULL, reward_item TEXT NOT NULL, reward_qty INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', helper_id TEXT, poster_claimed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market_offers (id TEXT PRIMARY KEY, seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, buyer_id TEXT, give_item TEXT NOT NULL, give_qty INTEGER NOT NULL, want_item TEXT NOT NULL, want_qty INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', seller_claimed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, clan_id TEXT, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gifts (id TEXT PRIMARY KEY, from_id TEXT NOT NULL, from_name TEXT NOT NULL, to_id TEXT NOT NULL, item TEXT NOT NULL, qty INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clan_wars (id TEXT PRIMARY KEY, attacker TEXT NOT NULL, defender TEXT NOT NULL, attacker_name TEXT NOT NULL, defender_name TEXT NOT NULL, won INTEGER NOT NULL, loot TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
SQL);
  return $pdo;
}

function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function new_id(): string { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); }

// ---------- per-player save files: data/saves/<username>.json ----------
function save_file(string $uid): string {
  $dir = dirname(DB_PATH) . '/saves';
  if (!is_dir($dir)) @mkdir($dir, 0770, true);
  $st = db()->prepare('SELECT username FROM users WHERE id=?'); $st->execute([$uid]);
  $name = strtolower((string)$st->fetchColumn());
  if (!preg_match('/^[a-z0-9_-]{1,40}$/', $name)) $name = $uid;
  return "$dir/$name.json";
}
function save_read(string $uid): ?array {
  $f = save_file($uid);
  if (is_file($f)) { $d = json_decode((string)file_get_contents($f), true); return is_array($d) ? $d : null; }
  // One-time move of an older database save into its own file.
  $st = db()->prepare('SELECT state, updated_at FROM saves WHERE user_id=?'); $st->execute([$uid]);
  $r = $st->fetch(); if (!$r) return null;
  $d = ['user_id' => $uid, 'state' => json_decode($r['state'], true), 'updated_at' => $r['updated_at']];
  save_write($uid, $d['state']);
  return $d;
}
function save_write(string $uid, $state): void {
  $json = json_encode(['user_id' => $uid, 'state' => $state, 'updated_at' => now()], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if (strlen($json) > 3000000) throw new Exception('Salvestus liiga suur');
  $f = save_file($uid); $tmp = $f . '.tmp';
  file_put_contents($tmp, $json, LOCK_EX); rename($tmp, $f);
}
function save_delete(string $uid): void { $f = save_file($uid); if (is_file($f)) @unlink($f); }
