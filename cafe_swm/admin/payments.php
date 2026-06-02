<?php
$page_title = 'Kelola Pembayaran';
require_once __DIR__ . '/../includes/header_admin.php';

$tunai = $pdo->query("SELECT COUNT(*) c, COALESCE(SUM(grand_total),0) t FROM orders WHERE metode_pembayaran='tunai' AND status_pembayaran='diterima'")->fetch();
$qris = $pdo->query("SELECT COUNT(*) c, COALESCE(SUM(grand_total),0) t FROM orders WHERE metode_pembayaran='qris' AND status_pembayaran='diterima'")->fetch();
$mb   = $pdo->query("SELECT COUNT(*) c, COALESCE(SUM(grand_total),0) t FROM orders WHERE metode_pembayaran='mobile_banking' AND status_pembayaran='diterima'")->fetch();

$method = $_GET['m'] ?? 'all';
$where = "status_pembayaran='diterima'";
if (in_array($method, ['tunai','qris','mobile_banking'])) $where .= " AND metode_pembayaran='$method'";
$rows = $pdo->query("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE $where ORDER BY o.id DESC LIMIT 200")->fetchAll();
?>
<div class="row g-3 mb-3">
  <div class="col-md-4"><div class="card stat-card p-3"><small class="text-muted">Tunai</small><h4><?= rupiah($tunai['t']) ?></h4><small class="text-muted"><?= $tunai['c'] ?> transaksi</small></div></div>
  <div class="col-md-4"><div class="card stat-card p-3"><small class="text-muted">QRIS</small><h4><?= rupiah($qris['t']) ?></h4><small class="text-muted"><?= $qris['c'] ?> transaksi</small></div></div>
  <div class="col-md-4"><div class="card stat-card p-3"><small class="text-muted">Mobile Banking</small><h4><?= rupiah($mb['t']) ?></h4><small class="text-muted"><?= $mb['c'] ?> transaksi</small></div></div>
</div>

<div class="card stat-card p-3">
  <div class="btn-group mb-3">
    <a href="?m=all" class="btn btn-sm <?= $method==='all'?'btn-swm':'btn-outline-secondary' ?>">Semua</a>
    <a href="?m=tunai" class="btn btn-sm <?= $method==='tunai'?'btn-swm':'btn-outline-secondary' ?>">Tunai</a>
    <a href="?m=qris" class="btn btn-sm <?= $method==='qris'?'btn-swm':'btn-outline-secondary' ?>">QRIS</a>
    <a href="?m=mobile_banking" class="btn btn-sm <?= $method==='mobile_banking'?'btn-swm':'btn-outline-secondary' ?>">Mobile Banking</a>
  </div>
  <div class="table-responsive">
    <table class="table table-swm">
      <thead><tr><th>No. Pesanan</th><th>Meja</th><th>Metode</th><th>Total</th><th>Tanggal</th></tr></thead>
      <tbody>
      <?php foreach ($rows as $r): ?>
        <tr><td><?= e($r['nomor_pesanan']) ?></td><td>Meja <?= e($r['nomor_meja']) ?></td><td><?= payment_label($r['metode_pembayaran']) ?></td><td><?= rupiah($r['grand_total']) ?></td><td><?= date('d/m/Y H:i', strtotime($r['created_at'])) ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
