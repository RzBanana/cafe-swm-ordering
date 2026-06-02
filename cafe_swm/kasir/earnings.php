<?php
$page_title = 'Rekap Pendapatan';
require_once __DIR__ . '/../includes/header_kasir.php';
$tgl = $_GET['tgl'] ?? date('Y-m-d');
$kasirId = $_SESSION['user']['id'];

$total = $pdo->prepare("SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE kasir_id=? AND DATE(created_at)=? AND status_pembayaran='diterima'");
$total->execute([$kasirId, $tgl]); $total = (float)$total->fetchColumn();

$cnt = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE kasir_id=? AND DATE(created_at)=? AND status_pembayaran='diterima'");
$cnt->execute([$kasirId, $tgl]); $cnt = (int)$cnt->fetchColumn();

$byMethod = $pdo->prepare("SELECT metode_pembayaran m, SUM(grand_total) t FROM orders WHERE kasir_id=? AND DATE(created_at)=? AND status_pembayaran='diterima' GROUP BY metode_pembayaran");
$byMethod->execute([$kasirId, $tgl]);
$byMethod = $byMethod->fetchAll();
?>
<div class="card stat-card p-3 mb-3">
  <form class="d-flex gap-2">
    <input type="date" name="tgl" class="form-control" value="<?= e($tgl) ?>">
    <button class="btn btn-swm">Tampilkan</button>
  </form>
</div>
<div class="row g-3">
  <div class="col-md-6"><div class="card stat-card p-4" style="background: linear-gradient(135deg,#6d4c2e,#2c1810);color:#fff;"><small class="opacity-75">Pendapatan</small><h2 class="fw-bold mt-2"><?= rupiah($total) ?></h2><small class="opacity-75"><?= date('d F Y', strtotime($tgl)) ?></small></div></div>
  <div class="col-md-6"><div class="card stat-card p-4"><small class="text-muted">Jumlah Transaksi</small><h2 class="fw-bold mt-2"><?= $cnt ?></h2><small class="text-muted">Transaksi sukses</small></div></div>
</div>
<div class="card stat-card p-3 mt-3">
  <h6>Per Metode Pembayaran</h6>
  <table class="table table-swm">
    <thead><tr><th>Metode</th><th>Total</th></tr></thead>
    <tbody>
    <?php foreach ($byMethod as $m): ?><tr><td><?= payment_label($m['m']) ?></td><td><?= rupiah($m['t']) ?></td></tr><?php endforeach; ?>
    <?php if (!$byMethod): ?><tr><td colspan="2" class="text-center text-muted">—</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
