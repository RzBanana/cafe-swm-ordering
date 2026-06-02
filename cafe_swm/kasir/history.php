<?php
$page_title = 'Riwayat Pesanan';
require_once __DIR__ . '/../includes/header_kasir.php';
$tgl = $_GET['tgl'] ?? date('Y-m-d');
$stmt = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE DATE(o.created_at)=? ORDER BY o.id DESC");
$stmt->execute([$tgl]);
$rows = $stmt->fetchAll();
$totalT = array_sum(array_map(fn($r)=> $r['status_pembayaran']==='diterima' ? $r['grand_total'] : 0, $rows));
?>
<div class="card stat-card p-3 mb-3">
  <form class="d-flex gap-2">
    <input type="date" name="tgl" class="form-control" value="<?= e($tgl) ?>">
    <button class="btn btn-swm">Tampilkan</button>
  </form>
</div>
<div class="card stat-card p-3 mb-3" style="background: linear-gradient(135deg,#6d4c2e,#2c1810);color:#fff;">
  <small class="opacity-75">Total Transaksi <?= date('d M Y', strtotime($tgl)) ?></small>
  <h3 class="fw-bold mt-1"><?= rupiah($totalT) ?></h3>
  <small class="opacity-75"><?= count($rows) ?> pesanan</small>
</div>
<div class="card stat-card p-3">
  <table class="table table-swm">
    <thead><tr><th>No.</th><th>Meja</th><th>Metode</th><th>Total</th><th>Status Bayar</th><th>Status</th><th>Waktu</th><th></th></tr></thead>
    <tbody>
    <?php foreach ($rows as $r): ?>
      <tr><td><?= e($r['nomor_pesanan']) ?></td><td>Meja <?= e($r['nomor_meja']) ?></td><td><?= payment_label($r['metode_pembayaran']) ?></td><td><?= rupiah($r['grand_total']) ?></td><td><?= e($r['status_pembayaran']) ?></td><td><?= status_label($r['status_pesanan']) ?></td><td><?= date('H:i', strtotime($r['created_at'])) ?></td><td><a class="btn btn-sm btn-outline-primary" href="<?= BASE_URL ?>/kasir/order_detail.php?id=<?= $r['id'] ?>"><i class="fas fa-eye"></i></a></td></tr>
    <?php endforeach; ?>
    <?php if (!$rows): ?><tr><td colspan="8" class="text-center text-muted">Tidak ada pesanan pada tanggal ini</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
