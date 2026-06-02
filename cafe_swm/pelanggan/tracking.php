<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$id = (int)($_GET['id'] ?? 0);
$stmt = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.id=?");
$stmt->execute([$id]);
$order = $stmt->fetch();
if (!$order) { echo '<div class="alert alert-danger m-4">Pesanan tidak ditemukan</div>'; exit; }

$steps = [
    'menunggu_pembayaran' => ['Menunggu Pembayaran', 'fa-clock'],
    'pembayaran_diterima' => ['Pembayaran Diterima', 'fa-check-circle'],
    'diproses'            => ['Sedang Diproses', 'fa-spinner'],
    'dimasak'             => ['Sedang Dimasak', 'fa-fire'],
    'siap_diantar'        => ['Siap Diantar', 'fa-utensils'],
    'selesai'             => ['Selesai', 'fa-flag-checkered'],
];
$keys = array_keys($steps);
$currentIdx = array_search($order['status_pesanan'], $keys);
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Tracking - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="15">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head><body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <h5 class="mb-0">Status Pesanan</h5>
    <span class="table-num">Meja <?= e($order['nomor_meja']) ?></span>
  </div>
</div>
<div class="container py-3">
  <div class="card stat-card p-3 mb-3 text-center">
    <small class="text-muted">No. Pesanan</small>
    <h5><?= e($order['nomor_pesanan']) ?></h5>
    <?php if ((int)$order['estimasi_waktu'] > 0): ?>
    <div class="mt-2 p-3 rounded" style="background:#fefae0;">
      <small class="text-muted">Estimasi Pesanan</small>
      <h3 class="fw-bold mb-0" style="color:#6d4c2e;"><?= (int)$order['estimasi_waktu'] ?> Menit</h3>
    </div>
    <?php endif; ?>
  </div>

  <div class="card stat-card p-4 mb-3">
    <h6 class="mb-3">Progres Pesanan</h6>
    <div class="timeline">
      <?php foreach ($steps as $key => $info):
        $idx = array_search($key, $keys);
        $cls = $idx < $currentIdx ? 'done' : ($idx === $currentIdx ? 'active' : '');
      ?>
        <div class="timeline-item <?= $cls ?>">
          <strong class="<?= $cls?'':'text-muted' ?>"><i class="fas <?= $info[1] ?>"></i> <?= $info[0] ?></strong>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <?php if ($order['status_pesanan']==='selesai'): ?>
    <div class="d-grid gap-2">
      <a href="<?= BASE_URL ?>/pelanggan/receipt.php?id=<?= $order['id'] ?>" class="btn btn-swm"><i class="fas fa-receipt"></i> Lihat Struk Digital</a>
      <a href="<?= BASE_URL ?>/pelanggan/menu.php" class="btn btn-outline-secondary">Pesan Lagi</a>
    </div>
  <?php else: ?>
    <div class="text-center"><small class="text-muted"><i class="fas fa-sync"></i> Halaman ini auto-refresh setiap 15 detik</small></div>
    <a href="<?= BASE_URL ?>/pelanggan/receipt.php?id=<?= $order['id'] ?>" class="btn btn-link w-100 mt-2">Lihat detail pesanan</a>
  <?php endif; ?>
</div>
</body></html>
