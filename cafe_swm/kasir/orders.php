<?php
$page_title = 'Pesanan Masuk';
require_once __DIR__ . '/../includes/header_kasir.php';

$orders = $pdo->query("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.status_pesanan NOT IN ('selesai','dibatalkan') ORDER BY o.id DESC")->fetchAll();
?>
<div class="row g-3">
<?php if (!$orders): ?>
  <div class="col-12"><div class="card stat-card p-4 text-center text-muted">Tidak ada pesanan aktif.</div></div>
<?php endif; ?>
<?php foreach ($orders as $o):
  $items = $pdo->prepare("SELECT * FROM order_items WHERE order_id=?");
  $items->execute([$o['id']]);
  $items = $items->fetchAll();
?>
  <div class="col-md-6 col-lg-4">
    <div class="card stat-card p-3 h-100">
      <div class="d-flex justify-content-between mb-2">
        <strong><?= e($o['nomor_pesanan']) ?></strong>
        <?= status_label($o['status_pesanan']) ?>
      </div>
      <p class="mb-1"><i class="fas fa-chair text-muted"></i> Meja <?= e($o['nomor_meja']) ?></p>
      <p class="mb-1"><i class="fas fa-credit-card text-muted"></i> <?= payment_label($o['metode_pembayaran']) ?></p>
      <p class="mb-2"><i class="fas fa-clock text-muted"></i> <?= date('H:i', strtotime($o['created_at'])) ?></p>
      <ul class="list-unstyled small mb-2">
        <?php foreach ($items as $i): ?>
          <li>&bull; <?= $i['jumlah'] ?>x <?= e($i['nama_produk']) ?><?php if ($i['catatan']): ?> <em class="text-muted">(<?= e($i['catatan']) ?>)</em><?php endif; ?></li>
        <?php endforeach; ?>
      </ul>
      <div class="d-flex justify-content-between mb-2"><strong>Total</strong><strong><?= rupiah($o['grand_total']) ?></strong></div>
      <a class="btn btn-swm w-100" href="<?= BASE_URL ?>/kasir/order_detail.php?id=<?= $o['id'] ?>">Kelola</a>
    </div>
  </div>
<?php endforeach; ?>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
