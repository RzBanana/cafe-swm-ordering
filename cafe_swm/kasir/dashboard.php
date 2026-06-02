<?php
$page_title = 'Dashboard Kasir';
require_once __DIR__ . '/../includes/header_kasir.php';

$baru = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status_pesanan IN ('menunggu_pembayaran','pembayaran_diterima') AND DATE(created_at)=CURDATE()")->fetchColumn();
$proses = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status_pesanan IN ('diproses','dimasak','siap_diantar') AND DATE(created_at)=CURDATE()")->fetchColumn();
$selesai = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status_pesanan='selesai' AND DATE(created_at)=CURDATE()")->fetchColumn();
$pendapatan = (float)$pdo->query("SELECT COALESCE(SUM(grand_total),0) FROM orders WHERE status_pembayaran='diterima' AND DATE(created_at)=CURDATE()")->fetchColumn();

$recent = $pdo->query("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE DATE(o.created_at)=CURDATE() ORDER BY o.id DESC LIMIT 10")->fetchAll();
?>
<div class="row g-3 mb-4">
  <div class="col-md-3 col-sm-6"><div class="card stat-card p-3"><div class="d-flex"><div class="icon-box bg-warning bg-opacity-25 text-warning me-3"><i class="fas fa-bell"></i></div><div><small class="text-muted">Pesanan Baru</small><h4><?= $baru ?></h4></div></div></div></div>
  <div class="col-md-3 col-sm-6"><div class="card stat-card p-3"><div class="d-flex"><div class="icon-box bg-info bg-opacity-25 text-info me-3"><i class="fas fa-fire"></i></div><div><small class="text-muted">Diproses</small><h4><?= $proses ?></h4></div></div></div></div>
  <div class="col-md-3 col-sm-6"><div class="card stat-card p-3"><div class="d-flex"><div class="icon-box bg-success bg-opacity-25 text-success me-3"><i class="fas fa-check-circle"></i></div><div><small class="text-muted">Selesai</small><h4><?= $selesai ?></h4></div></div></div></div>
  <div class="col-md-3 col-sm-6"><div class="card stat-card p-3" style="background: linear-gradient(135deg,#6d4c2e,#2c1810);color:#fff;"><small class="opacity-75">Pendapatan Hari Ini</small><h4 class="mb-0 mt-1"><?= rupiah($pendapatan) ?></h4></div></div>
</div>

<div class="card stat-card p-3">
  <h6>Pesanan Hari Ini</h6>
  <div class="table-responsive">
    <table class="table table-swm">
      <thead><tr><th>No.</th><th>Meja</th><th>Metode</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>
      <?php foreach ($recent as $r): ?>
        <tr><td><?= e($r['nomor_pesanan']) ?></td><td>Meja <?= e($r['nomor_meja']) ?></td><td><?= payment_label($r['metode_pembayaran']) ?></td><td><?= rupiah($r['grand_total']) ?></td><td><?= status_label($r['status_pesanan']) ?></td><td><a class="btn btn-sm btn-swm" href="<?= BASE_URL ?>/kasir/order_detail.php?id=<?= $r['id'] ?>">Detail</a></td></tr>
      <?php endforeach; ?>
      <?php if (!$recent): ?><tr><td colspan="6" class="text-center text-muted">Belum ada pesanan</td></tr><?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
