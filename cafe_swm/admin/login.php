<?php
require_once __DIR__ . '/../includes/auth.php';

if (!empty($_SESSION['user']) && $_SESSION['user']['role'] === 'admin') {
    redirect(BASE_URL . '/admin/dashboard.php');
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if (attempt_login($pdo, $username, $password, 'admin')) {
        redirect(BASE_URL . '/admin/dashboard.php');
    }
    $error = 'Username atau password salah.';
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Login Admin - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet">
</head>
<body>
<div class="login-wrap">
  <div class="login-card">
    <div class="text-center mb-4">
      <h2 style="color: var(--swm-primary);"><i class="fas fa-user-shield"></i></h2>
      <h4 class="fw-bold">Login Admin</h4>
      <p class="text-muted small"><?= APP_NAME ?> &middot; Panel Administrasi</p>
    </div>
    <?php if ($error): ?>
      <div class="alert alert-danger"><?= e($error) ?></div>
    <?php endif; ?>
    <form method="POST">
      <div class="mb-3">
        <label class="form-label">Username</label>
        <input type="text" name="username" class="form-control" required autofocus>
      </div>
      <div class="mb-3">
        <label class="form-label">Password</label>
        <input type="password" name="password" class="form-control" required>
      </div>
      <button type="submit" class="btn btn-swm w-100">Masuk</button>
    </form>
    <div class="text-center mt-3">
      <a href="<?= BASE_URL ?>/" class="text-muted small">&larr; Kembali ke beranda</a>
    </div>
    <div class="alert alert-info mt-3 small mb-0">
      <strong>Demo:</strong> admin / admin123
    </div>
  </div>
</div>
</body>
</html>
