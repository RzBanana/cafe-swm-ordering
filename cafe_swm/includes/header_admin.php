<?php
require_once __DIR__ . '/auth.php';
require_login('admin');
$user = current_user();
$current = basename($_SERVER['SCRIPT_NAME']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($page_title ?? 'Admin') ?> - <?= APP_NAME ?></title>
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet">
</head>
<body>
<div class="container-fluid">
  <div class="row">
    <nav class="col-md-3 col-lg-2 sidebar p-0">
      <div class="brand"><i class="fas fa-mug-hot"></i> <?= APP_NAME ?></div>
      <ul class="nav flex-column">
        <li class="nav-item"><a class="nav-link <?= $current==='dashboard.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/dashboard.php"><i class="fas fa-gauge-high"></i> Dashboard</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='products.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/products.php"><i class="fas fa-utensils"></i> Produk</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='categories.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/categories.php"><i class="fas fa-tags"></i> Kategori</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='tables.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/tables.php"><i class="fas fa-chair"></i> Meja & QR</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='employees.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/employees.php"><i class="fas fa-user-tie"></i> Pegawai</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='orders.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/orders.php"><i class="fas fa-receipt"></i> Pesanan</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='payments.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/payments.php"><i class="fas fa-money-bill-wave"></i> Pembayaran</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='reports.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/reports.php"><i class="fas fa-chart-line"></i> Laporan</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='profile.php'?'active':'' ?>" href="<?= BASE_URL ?>/admin/profile.php"><i class="fas fa-user"></i> Profil</a></li>
        <li class="nav-item mt-3"><a class="nav-link text-danger" href="<?= BASE_URL ?>/admin/logout.php"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      </ul>
    </nav>
    <main class="col-md-9 col-lg-10 ms-sm-auto px-4 py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="mb-0"><?= e($page_title ?? '') ?></h3>
        <div class="text-end">
          <small class="text-muted d-block">Login sebagai</small>
          <strong><?= e($user['nama']) ?></strong>
        </div>
      </div>
      <?= flash_render() ?>
