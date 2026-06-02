<?php
$page_title = 'Dashboard';
require_once __DIR__ . '/../includes/header_admin.php';

$totalProduk   = (int)$pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
$totalMeja     = (int)$pdo->query("SELECT COUNT(*) FROM tables_master")->fetchColumn();
$totalPegawai  = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='kasir'")->fetchColumn();
$totalPesanan  = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
$pendapatanHariIni = (float)$pdo->query("SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE DATE(created_at)=CURDATE() AND status_pembayaran='diterima'")->fetchColumn();

// Grafik 7 hari terakhir
$rows = $pdo->query("
    SELECT DATE(created_at) tgl, COALESCE(SUM(grand_total),0) total
    FROM orders WHERE status_pembayaran='diterima' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(created_at) ORDER BY tgl
")->fetchAll();
$labels=[]; $values=[];
for ($i=6; $i>=0; $i--) {
    $d = date('Y-m-d', strtotime("-$i day"));
    $labels[] = date('d M', strtotime($d));
    $found = 0;
    foreach ($rows as $r) if ($r['tgl'] === $d) $found = (float)$r['total'];
    $values[] = $found;
}

$recent = $pdo->query("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id ORDER BY o.id DESC LIMIT 8")->fetchAll();
?>
<div class="row g-3 mb-4">
  <div class="col-md-3 col-sm-6">
    <div class="card stat-card p-3 h-100">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-warning bg-opacity-25 text-warning me-3"><i class="fas fa-utensils"></i></div>
        <div><small class="text-muted">Total Produk</small><h4 class="mb-0"><?= $totalProduk ?></h4></div>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6">
    <div class="card stat-card p-3 h-100">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-info bg-opacity-25 text-info me-3"><i class="fas fa-chair"></i></div>
        <div><small class="text-muted">Total Meja</small><h4 class="mb-0"><?= $totalMeja ?></h4></div>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6">
    <div class="card stat-card p-3 h-100">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-success bg-opacity-25 text-success me-3"><i class="fas fa-user-tie"></i></div>
        <div><small class="text-muted">Total Pegawai</small><h4 class="mb-0"><?= $totalPegawai ?></h4></div>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6">
    <div class="card stat-card p-3 h-100">
      <div class="d-flex align-items-center">
        <div class="icon-box bg-primary bg-opacity-25 text-primary me-3"><i class="fas fa-receipt"></i></div>
        <div><small class="text-muted">Total Pesanan</small><h4 class="mb-0"><?= $totalPesanan ?></h4></div>
      </div>
    </div>
  </div>
</div>

<div class="row g-3 mb-4">
  <div class="col-md-5">
    <div class="card stat-card p-4 h-100" style="background: linear-gradient(135deg,#6d4c2e,#2c1810); color:#fff;">
      <small class="text-light opacity-75">Pendapatan Hari Ini</small>
      <h2 class="fw-bold mt-2"><?= rupiah($pendapatanHariIni) ?></h2>
      <small class="opacity-75"><?= date('d F Y') ?></small>
    </div>
  </div>
  <div class="col-md-7">
    <div class="card stat-card p-3 h-100">
      <h6 class="mb-3">Grafik Pendapatan 7 Hari Terakhir</h6>
      <canvas id="chartWeek" height="120"></canvas>
    </div>
  </div>
</div>

<div class="card stat-card p-3">
  <h6 class="mb-3">Pesanan Terbaru</h6>
  <div class="table-responsive">
    <table class="table table-swm">
      <thead><tr><th>No. Pesanan</th><th>Meja</th><th>Total</th><th>Metode</th><th>Status</th><th>Waktu</th></tr></thead>
      <tbody>
      <?php foreach ($recent as $r): ?>
        <tr>
          <td><?= e($r['nomor_pesanan']) ?></td>
          <td>Meja <?= e($r['nomor_meja']) ?></td>
          <td><?= rupiah($r['grand_total']) ?></td>
          <td><?= payment_label($r['metode_pembayaran']) ?></td>
          <td><?= status_label($r['status_pesanan']) ?></td>
          <td><?= date('H:i', strtotime($r['created_at'])) ?></td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$recent): ?>
        <tr><td colspan="6" class="text-center text-muted">Belum ada pesanan</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<script>
const ctx = document.getElementById('chartWeek');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: <?= json_encode($labels) ?>,
    datasets: [{ label: 'Pendapatan', data: <?= json_encode($values) ?>, borderColor: '#6d4c2e', backgroundColor: 'rgba(212,163,115,0.2)', tension: 0.3, fill: true }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
});
</script>
<?php require __DIR__ . '/../includes/footer.php'; ?>
