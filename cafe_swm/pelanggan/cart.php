<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

if (empty($_SESSION['pelanggan_table_id'])) redirect(BASE_URL . '/');
$cart = $_SESSION['cart'] ?? [];

$total = 0;
foreach ($cart as $it) $total += $it['harga'] * $it['qty'];
$pajak = $total * TAX_PERCENT / 100;
$grand = $total + $pajak;
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Keranjang - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head><body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <div class="d-flex align-items-center gap-2"><a href="<?= BASE_URL ?>/pelanggan/menu.php" class="text-white"><i class="fas fa-arrow-left"></i></a><h5 class="mb-0">Keranjang</h5></div>
    <span class="table-num">Meja <?= e($_SESSION['pelanggan_meja']) ?></span>
  </div>
</div>

<div class="container py-3">
  <?= flash_render() ?>
  <?php if (!$cart): ?>
    <div class="text-center py-5">
      <i class="fas fa-shopping-cart text-muted" style="font-size:3rem;"></i>
      <p class="text-muted mt-3">Keranjang masih kosong</p>
      <a href="<?= BASE_URL ?>/pelanggan/menu.php" class="btn btn-swm">Lihat Menu</a>
    </div>
  <?php else: ?>
    <?php foreach ($cart as $key => $it): ?>
      <div class="card mb-2 stat-card p-3">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <h6 class="mb-1"><?= e($it['nama']) ?></h6>
            <small class="text-muted"><?= rupiah($it['harga']) ?></small>
            <?php if (!empty($it['catatan'])): ?>
              <p class="small text-muted mt-1 mb-0"><i class="fas fa-sticky-note"></i> <?= e($it['catatan']) ?></p>
            <?php endif; ?>
          </div>
          <div class="text-end">
            <form method="POST" action="<?= BASE_URL ?>/api/cart_action.php" class="d-flex align-items-center gap-2 mb-1">
              <input type="hidden" name="action" value="qty">
              <input type="hidden" name="key" value="<?= e($key) ?>">
              <button name="op" value="dec" class="btn btn-sm btn-outline-secondary">−</button>
              <span style="min-width:30px;text-align:center;"><strong><?= $it['qty'] ?></strong></span>
              <button name="op" value="inc" class="btn btn-sm btn-outline-secondary">+</button>
            </form>
            <strong><?= rupiah($it['harga']*$it['qty']) ?></strong>
            <form method="POST" action="<?= BASE_URL ?>/api/cart_action.php" class="d-inline">
              <input type="hidden" name="action" value="remove">
              <input type="hidden" name="key" value="<?= e($key) ?>">
              <button class="btn btn-sm btn-link text-danger p-0"><small>Hapus</small></button>
            </form>
          </div>
        </div>
      </div>
    <?php endforeach; ?>
    <div class="card stat-card p-3 mt-3">
      <div class="d-flex justify-content-between mb-1"><span>Subtotal</span><span><?= rupiah($total) ?></span></div>
      <div class="d-flex justify-content-between mb-1"><span>Pajak (<?= TAX_PERCENT ?>%)</span><span><?= rupiah($pajak) ?></span></div>
      <hr>
      <div class="d-flex justify-content-between"><strong>Grand Total</strong><strong style="color:#6d4c2e;"><?= rupiah($grand) ?></strong></div>
      <a href="<?= BASE_URL ?>/pelanggan/checkout.php" class="btn btn-swm w-100 mt-3"><i class="fas fa-arrow-right"></i> Checkout</a>
    </div>
  <?php endif; ?>
</div>
<script src="https://cdn.jsdelivr.net/npm/[email protected]/dist/js/bootstrap.bundle.min.js"></script>
</body></html>
