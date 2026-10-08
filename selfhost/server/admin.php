<?php
// TUHK admin: reset a player's password or delete an account. Protected by ADMIN_PASSWORD in api/config.php.
require_once __DIR__ . '/api/db.php';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (ADMIN_PASSWORD === 'muuda-mind') $msg = 'Muuda enne ADMIN_PASSWORD failis api/config.php.';
  elseif (!hash_equals(ADMIN_PASSWORD, (string)($_POST['admin'] ?? ''))) { usleep(1000000); $msg = 'Vale admini parool.'; }
  else {
    $st = db()->prepare('SELECT id FROM users WHERE username=?'); $st->execute([trim((string)($_POST['user'] ?? ''))]);
    $id = $st->fetchColumn();
    if (!$id) $msg = 'Sellist kasutajat pole.';
    elseif (($_POST['do'] ?? '') === 'delete') { save_delete($id); db()->prepare('DELETE FROM users WHERE id=?')->execute([$id]); $msg = 'Konto kustutatud.'; }
    elseif (strlen((string)($_POST['pw'] ?? '')) < 6) $msg = 'Uus parool peab olema vähemalt 6 märki.';
    else {
      db()->prepare('UPDATE users SET pass_hash=? WHERE id=?')->execute([password_hash($_POST['pw'], PASSWORD_DEFAULT), $id]);
      db()->prepare('DELETE FROM sessions WHERE user_id=?')->execute([$id]);
      $msg = 'Parool muudetud.';
    }
  }
}
$count = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
?><!doctype html><html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TUHK admin</title>
<style>body{font-family:monospace;background:#14110f;color:#e8dcc8;max-width:420px;margin:40px auto;padding:0 16px}input,select,button{display:block;width:100%;margin:6px 0;padding:8px;background:#221d19;color:inherit;border:1px solid #6b5a45}button{background:#c46a2b;color:#14110f;font-weight:bold;cursor:pointer}.m{color:#f0b35a}</style></head>
<body><h1>TUHK admin</h1><p>Mängijaid: <?= $count ?></p><?php if ($msg): ?><p class="m"><?= htmlspecialchars($msg) ?></p><?php endif; ?>
<form method="post"><input name="admin" type="password" placeholder="Admini parool" required><input name="user" placeholder="Mängija kasutajanimi" required>
<input name="pw" type="password" placeholder="Uus parool (lähtestamiseks)"><select name="do"><option value="reset">Lähtesta parool</option><option value="delete">Kustuta konto</option></select><button>Tee ära</button></form></body></html>
