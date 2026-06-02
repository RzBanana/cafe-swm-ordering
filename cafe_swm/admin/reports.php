<?php
$page_title = 'Laporan Pendapatan';
require_once __DIR__ . '/../includes/header_admin.php';

$type = $_GET['type'] ?? 'daily';
$from = $_GET['from'] ?? date('Y-m-01');
$to   = $_GET['to']   ?? date('Y-m-d');
$month = $_GET['month'] ?? date('Y-m');
$year = $_GET['year'] ?? date('Y');

if ($type === 'daily') {
    $stmt = $pdo->prepare("SELECT DATE(created_at) tgl, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' AND DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY tgl");
    $stmt->execute([$from, $to]);
    $rows = $stmt->fetchAll();
    $labelKey = 'tgl';
} elseif ($type === 'monthly') {
    $stmt = $pdo->prepare("SELECT DATE_FORMAT(created_at,'%Y-%m') bulan, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' AND YEAR(created_at)=? GROUP BY bulan ORDER BY bulan");
    $stmt->execute([substr($month,0,4)]);
    $rows = $stmt->fetchAll();
    $labelKey = 'bulan';
} else {
    $rows = $pdo->query("SELECT YEAR(created_at) tahun, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' GROUP BY YEAR(created_at) ORDER BY tahun")->fetchAll();
    $labelKey = 'tahun';
}

$totalAll = array_sum(array_column($rows, 'total'));
$jumlahAll = array_sum(array_column($rows, 'jumlah'));

$labels = array_column($rows, $labelKey);
$values = array_map('floatval', array_column($rows, 'total'));
?>
<div class="card stat-card p-3 mb-3">
  <form method="GET" class="row g-2 align-items-end">
    <div class="col-md-3">
      <label class="form-label">Tipe Laporan</label>
      <select class="form-select" name="type" onchange="this.form.submit()">
        <option value="daily" <?= $type==='daily'?'selected':'' ?>>Harian</option>
        <option value="monthly" <?= $type==='monthly'?'selected':'' ?>>Bulanan</option>
        <option value="yearly" <?= $type==='yearly'?'selected':'' ?>>Tahunan</option>
      </select>
    </div>
    <?php if ($type==='daily'): ?>
      <div class="col-md-3"><label class="form-label">Dari</label><input type="date" name="from" class="form-control" value="<?= e($from) ?>"></div>
      <div class="col-md-3"><label class="form-label">Sampai</label><input type="date" name="to" class="form-control" value="<?= e($to) ?>"></div>
    <?php elseif ($type==='monthly'): ?>
      <div class="col-md-3"><label class="form-label">Tahun</label><input type="number" name="month" class="form-control" value="<?= e(substr($month,0,4)) ?>"></div>
    <?php endif; ?>
    <div class="col-md-3"><button class="btn btn-swm w-100">Tampilkan</button></div>
    <div class="col-md-3"><a class="btn btn-success w-100" href="<?= BASE_URL ?>/admin/export.php?<?= http_build_query($_GET) ?>"><i class="fas fa-file-excel"></i> Export Excel</a></div>
  </form>
</div>

<div class="row g-3 mb-3">
  <div class="col-md-6"><div class="card stat-card p-3" style="background: linear-gradient(135deg,#6d4c2e,#2c1810); color:#fff;"><small>Total Pendapatan</small><h3 class="fw-bold mt-1"><?= rupiah($totalAll) ?></h3></div></div>
  <div class="col-md-6"><div class="card stat-card p-3"><small class="text-muted">Total Transaksi</small><h3 class="fw-bold mt-1"><?= $jumlahAll ?></h3></div></div>
</div>

<div class="card stat-card p-3 mb-3">
  <h6>Grafik Pendapatan (<?= ucfirst($type) ?>)</h6>
  <canvas id="chartReport" height="80"></canvas>
</div>

<div class="card stat-card p-3">
  <h6>Detail Laporan</h6>
  <table class="table table-swm">
    <thead><tr><th>Periode</th><th>Jumlah Transaksi</th><th>Total Pendapatan</th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr><td><?= e($r[$labelKey]) ?></td><td><?= $r['jumlah'] ?></td><td><?= rupiah($r['total']) ?></td></tr>
    <?php endforeach; ?>
    <?php if (!$rows): ?><tr><td colspan="3" class="text-center text-muted">Tidak ada data</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>

<script>
new Chart(document.getElementById('chartReport'), {
  type: 'bar',
  data: { labels: <?= json_encode($labels) ?>, datasets: [{ label: 'Pendapatan', data: <?= json_encode($values) ?>, backgroundColor: '#d4a373' }] },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
});
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>
