<?php
require_once __DIR__ . '/config/app.php';
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= APP_NAME ?> - <?= APP_TAGLINE ?></title>
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet">
<style>
.hero { min-height: 100vh; background: linear-gradient(135deg, #2c1810 0%, #6d4c2e 100%); color: #fff; display: flex; align-items: center; }
.hero h1 { font-size: 3rem; font-weight: 700; color: #d4a373; }
.role-card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; transition: all 0.25s; color: #fff; text-decoration: none; display: block; }
.role-card:hover { background: rgba(255,255,255,0.13); transform: translateY(-4px); color: #fff; }
.role-card i { font-size: 2.5rem; color: #d4a373; margin-bottom: 1rem; }
</style>
</head>
<body>
<section class="hero">
  <div class="container">
    <div class="text-center mb-5">
      <h1><i class="fas fa-mug-hot"></i> <?= APP_NAME ?></h1>
      <p class="lead text-light"><?= APP_TAGLINE ?></p>
    </div>
    <div class="row g-4 justify-content-center">
      <div class="col-md-4">
        <a href="<?= BASE_URL ?>/pelanggan/index.php?meja=01" class="role-card text-center">
          <i class="fas fa-qrcode"></i>
          <h4>Pelanggan</h4>
          <p class="mb-0 text-light">Scan QR meja untuk memesan (demo: meja 01)</p>
        </a>
      </div>
      <div class="col-md-4">
        <a href="<?= BASE_URL ?>/kasir/login.php" class="role-card text-center">
          <i class="fas fa-cash-register"></i>
          <h4>Kasir</h4>
          <p class="mb-0 text-light">Login untuk mengelola pesanan</p>
        </a>
      </div>
      <div class="col-md-4">
        <a href="<?= BASE_URL ?>/admin/login.php" class="role-card text-center">
          <i class="fas fa-user-shield"></i>
          <h4>Admin</h4>
          <p class="mb-0 text-light">Login untuk panel administrasi</p>
        </a>
      </div>
    </div>
    <div class="text-center mt-5 text-light">
      <small>Demo: admin / admin123 &nbsp;|&nbsp; kasir1 / kasir123</small>
    </div>
  </div>
</section>
</body>
</html>
