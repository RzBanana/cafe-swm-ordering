<?php
require_once __DIR__ . '/../includes/auth.php';
if (!empty($_SESSION['user']) && $_SESSION['user']['role'] === 'kasir') redirect(BASE_URL . '/kasir/dashboard.php');

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (attempt_login($pdo, trim($_POST['username']), $_POST['password'], 'kasir')) {
        redirect(BASE_URL . '/kasir/dashboard.php');
    }
    $error = 'Username atau password salah.';
}
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Login Kasir - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head>
<body><div class="login-wrap"><div class="login-card">
  <div class="text-center mb-4">
    <h2 style="color: var(--swm-primary);"><i class="fas fa-cash-register"></i></h2>
    <h4 class="fw-bold">Login Kasir</h4>
    <p class="text-muted small"><?= APP_NAME ?></p>
  </div>
  <?php if ($error): ?><div class="alert alert-danger"><?= e($error) ?></div><?php endif; ?>
  <form method="POST">
    <div class="mb-3"><label class="form-label">Username</label><input class="form-control" name="username" required autofocus></div>
    <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" name="password" required></div>
    <button class="btn btn-swm w-100">Masuk</button>
  </form>
  <div class="text-center mt-3"><a href="<?= BASE_URL ?>/" class="text-muted small">&larr; Beranda</a></div>
  <div class="alert alert-info mt-3 small mb-0"><strong>Demo:</strong> kasir1 / kasir123</div>
</div></div></body></html>
