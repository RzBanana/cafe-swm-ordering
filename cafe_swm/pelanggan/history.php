<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

if (empty($_SESSION['pelanggan_table_id'])) redirect(BASE_URL . '/');
$tableId = $_SESSION['pelanggan_table_id'];

$rows = $pdo->prepare("SELECT * FROM orders WHERE table_id=? AND DATE(created_at)=CURDATE() ORDER BY id DESC");
$rows->execute([$tableId]);
$rows = $rows->fetchAll();
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Riwayat - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head><body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <div class="d-flex align-items-center gap-2"><a href="<?= BASE_URL ?>/pelanggan/menu.php" class="text-white"><i class="fas fa-arrow-left"></i></a><h5 class="mb-0">Riwayat Hari Ini</h5></div>
    <span class="table-num">Meja <?= e($_SESSION['pelanggan_meja']) ?></span>
  </div>
</div>
<div class="container py-3">
  <?php if (!$rows): ?>
    <div class="text-center py-5 text-muted"><i class="fas fa-receipt" style="font-size:3rem;"></i><p class="mt-3">Belum ada pesanan hari ini</p></div>
  <?php endif; ?>
  <?php foreach ($rows as $r): ?>
    <div class="card stat-card p-3 mb-2">
      <div class="d-flex justify-content-between"><strong><?= e($r['nomor_pesanan']) ?></strong><?= status_label($r['status_pesanan']) ?></div>
      <small class="text-muted"><?= date('H:i', strtotime($r['created_at'])) ?> &middot; <?= payment_label($r['metode_pembayaran']) ?></small>
      <div class="d-flex justify-content-between mt-2"><strong style="color:#6d4c2e;"><?= rupiah($r['grand_total']) ?></strong>
        <div>
          <a class="btn btn-sm btn-outline-primary" href="<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $r['id'] ?>">Lacak</a>
          <a class="btn btn-sm btn-outline-secondary" href="<?= BASE_URL ?>/pelanggan/receipt.php?id=<?= $r['id'] ?>">Struk</a>
        </div>
      </div>
    </div>
  <?php endforeach; ?>
</div>
</body></html>
