<?php
require_once __DIR__ . '/auth.php';
require_login('kasir');
$user = current_user();
$current = basename($_SERVER['SCRIPT_NAME']);
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($page_title ?? 'Kasir') ?> - <?= APP_NAME ?></title>
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
      <small class="text-secondary px-4 d-block mb-2">PANEL KASIR</small>
      <ul class="nav flex-column">
        <li class="nav-item"><a class="nav-link <?= $current==='dashboard.php'?'active':'' ?>" href="<?= BASE_URL ?>/kasir/dashboard.php"><i class="fas fa-gauge-high"></i> Dashboard</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='orders.php'?'active':'' ?>" href="<?= BASE_URL ?>/kasir/orders.php"><i class="fas fa-bell"></i> Pesanan Masuk</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='history.php'?'active':'' ?>" href="<?= BASE_URL ?>/kasir/history.php"><i class="fas fa-clock-rotate-left"></i> Riwayat</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='earnings.php'?'active':'' ?>" href="<?= BASE_URL ?>/kasir/earnings.php"><i class="fas fa-coins"></i> Rekap Pendapatan</a></li>
        <li class="nav-item"><a class="nav-link <?= $current==='profile.php'?'active':'' ?>" href="<?= BASE_URL ?>/kasir/profile.php"><i class="fas fa-user"></i> Profil</a></li>
        <li class="nav-item mt-3"><a class="nav-link text-danger" href="<?= BASE_URL ?>/kasir/logout.php"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      </ul>
    </nav>
    <main class="col-md-9 col-lg-10 ms-sm-auto px-4 py-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h3 class="mb-0"><?= e($page_title ?? '') ?></h3>
        <div class="text-end">
          <small class="text-muted d-block">Kasir aktif</small>
          <strong><?= e($user['nama']) ?></strong>
        </div>
      </div>
      <?= flash_render() ?>
