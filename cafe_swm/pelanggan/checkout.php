<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

if (empty($_SESSION['pelanggan_table_id'])) redirect(BASE_URL . '/');
$cart = $_SESSION['cart'] ?? [];
if (!$cart) redirect(BASE_URL . '/pelanggan/menu.php');

$total = 0; foreach ($cart as $it) $total += $it['harga']*$it['qty'];
$pajak = $total * TAX_PERCENT / 100;
$grand = $total + $pajak;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $metode = $_POST['metode'] ?? 'tunai';
    if (!in_array($metode, ['tunai','qris','mobile_banking'])) $metode = 'tunai';

    $pdo->beginTransaction();
    try {
        $no = generate_order_number();
        $pdo->prepare("INSERT INTO orders (nomor_pesanan, table_id, total, pajak, grand_total, metode_pembayaran, status_pembayaran, status_pesanan) VALUES (?,?,?,?,?,?,?,?)")
            ->execute([$no, $_SESSION['pelanggan_table_id'], $total, $pajak, $grand, $metode, 'menunggu', 'menunggu_pembayaran']);
        $orderId = (int)$pdo->lastInsertId();
        $stmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, nama_produk, harga, jumlah, subtotal, catatan) VALUES (?,?,?,?,?,?,?)");
        foreach ($cart as $it) {
            $sub = $it['harga'] * $it['qty'];
            $stmt->execute([$orderId, $it['product_id'], $it['nama'], $it['harga'], $it['qty'], $sub, $it['catatan'] ?? '']);
        }
        $pdo->commit();
        $_SESSION['cart'] = [];
        $_SESSION['last_order_id'] = $orderId;
        redirect(BASE_URL . '/pelanggan/payment.php?id=' . $orderId);
    } catch (Throwable $e) {
        $pdo->rollBack();
        flash_set('error', 'Gagal membuat pesanan: ' . $e->getMessage());
        redirect(BASE_URL . '/pelanggan/checkout.php');
    }
}
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Checkout - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head><body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <div class="d-flex align-items-center gap-2"><a href="<?= BASE_URL ?>/pelanggan/cart.php" class="text-white"><i class="fas fa-arrow-left"></i></a><h5 class="mb-0">Checkout</h5></div>
    <span class="table-num">Meja <?= e($_SESSION['pelanggan_meja']) ?></span>
  </div>
</div>
<div class="container py-3">
  <div class="card stat-card p-3 mb-3">
    <h6>Ringkasan Pesanan</h6>
    <?php foreach ($cart as $it): ?>
      <div class="d-flex justify-content-between"><span><?= $it['qty'] ?>x <?= e($it['nama']) ?></span><span><?= rupiah($it['harga']*$it['qty']) ?></span></div>
    <?php endforeach; ?>
    <hr>
    <div class="d-flex justify-content-between"><span>Subtotal</span><span><?= rupiah($total) ?></span></div>
    <div class="d-flex justify-content-between"><span>Pajak <?= TAX_PERCENT ?>%</span><span><?= rupiah($pajak) ?></span></div>
    <div class="d-flex justify-content-between mt-2"><strong>Grand Total</strong><strong><?= rupiah($grand) ?></strong></div>
  </div>

  <form method="POST">
    <div class="card stat-card p-3 mb-3">
      <h6>Pilih Metode Pembayaran</h6>
      <div class="form-check p-3 border rounded mb-2"><input class="form-check-input" type="radio" name="metode" value="tunai" id="m1" checked><label class="form-check-label w-100" for="m1"><i class="fas fa-money-bill-wave text-success"></i> <strong>Tunai</strong> <small class="text-muted d-block">Bayar di Kasir</small></label></div>
      <div class="form-check p-3 border rounded mb-2"><input class="form-check-input" type="radio" name="metode" value="qris" id="m2"><label class="form-check-label w-100" for="m2"><i class="fas fa-qrcode text-primary"></i> <strong>QRIS</strong> <small class="text-muted d-block">Scan QR Code (Midtrans)</small></label></div>
      <div class="form-check p-3 border rounded"><input class="form-check-input" type="radio" name="metode" value="mobile_banking" id="m3"><label class="form-check-label w-100" for="m3"><i class="fas fa-university text-warning"></i> <strong>Mobile Banking</strong> <small class="text-muted d-block">Transfer via Virtual Account (Midtrans)</small></label></div>
    </div>
    <button class="btn btn-swm w-100">Lanjutkan Pembayaran</button>
  </form>
</div>
<script src="https://cdn.jsdelivr.net/npm/[email protected]/dist/js/bootstrap.bundle.min.js"></script>
</body></html>
