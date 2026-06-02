<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$id = (int)($_GET['id'] ?? 0);
$auto = isset($_GET['print']);

$stmt = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.id=?");
$stmt->execute([$id]);
$order = $stmt->fetch();
if (!$order) { echo 'Pesanan tidak ditemukan'; exit; }

$items = $pdo->prepare("SELECT * FROM order_items WHERE order_id=?");
$items->execute([$id]); $items = $items->fetchAll();
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Struk - <?= e($order['nomor_pesanan']) ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet">
<style>.receipt{max-width:380px;margin:20px auto;background:#fff;padding:25px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);font-family:'Courier New',monospace;} .receipt h4{text-align:center;margin-bottom:0;} .dash{border-top:1px dashed #888;margin:10px 0;}</style>
</head><body style="background:#faf6f1;">
<div class="receipt">
  <h4><?= APP_NAME ?></h4>
  <p class="text-center text-muted mb-2"><small><?= APP_TAGLINE ?></small></p>
  <div class="dash"></div>
  <div class="d-flex justify-content-between"><span>No. Pesanan:</span><strong><?= e($order['nomor_pesanan']) ?></strong></div>
  <div class="d-flex justify-content-between"><span>Meja:</span><strong><?= e($order['nomor_meja']) ?></strong></div>
  <div class="d-flex justify-content-between"><span>Tanggal:</span><span><?= date('d/m/Y H:i', strtotime($order['created_at'])) ?></span></div>
  <div class="d-flex justify-content-between"><span>Metode:</span><span><?= payment_label($order['metode_pembayaran']) ?></span></div>
  <div class="dash"></div>
  <?php foreach ($items as $i): ?>
    <div><?= e($i['nama_produk']) ?></div>
    <div class="d-flex justify-content-between"><small><?= $i['jumlah'] ?> x <?= rupiah($i['harga']) ?></small><span><?= rupiah($i['subtotal']) ?></span></div>
    <?php if ($i['catatan']): ?><div class="text-muted"><small>Note: <?= e($i['catatan']) ?></small></div><?php endif; ?>
  <?php endforeach; ?>
  <div class="dash"></div>
  <div class="d-flex justify-content-between"><span>Subtotal</span><span><?= rupiah($order['total']) ?></span></div>
  <div class="d-flex justify-content-between"><span>Pajak</span><span><?= rupiah($order['pajak']) ?></span></div>
  <div class="d-flex justify-content-between"><strong>TOTAL</strong><strong><?= rupiah($order['grand_total']) ?></strong></div>
  <?php if ($order['uang_dibayar']): ?>
  <div class="d-flex justify-content-between"><span>Bayar</span><span><?= rupiah($order['uang_dibayar']) ?></span></div>
  <div class="d-flex justify-content-between"><span>Kembalian</span><span><?= rupiah($order['kembalian']) ?></span></div>
  <?php endif; ?>
  <div class="dash"></div>
  <p class="text-center mb-0"><small>Terima kasih atas kunjungan Anda!</small></p>
  <div class="text-center mt-3 no-print">
    <button onclick="window.print()" class="btn btn-swm"><i class="fas fa-print"></i> Cetak</button>
    <a href="<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>" class="btn btn-outline-secondary">Tracking</a>
  </div>
</div>
<?php if ($auto): ?><script>window.print();</script><?php endif; ?>
</body></html>
