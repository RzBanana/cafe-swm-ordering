<?php
$page_title = 'Kelola Pesanan';
require_once __DIR__ . '/../includes/header_admin.php';

if (($_GET['action'] ?? '') === 'cancel' && isset($_GET['id'])) {
    $pdo->prepare("UPDATE orders SET status_pesanan='dibatalkan', status_pembayaran='dibatalkan' WHERE id=?")->execute([(int)$_GET['id']]);
    flash_set('success', 'Pesanan dibatalkan');
    redirect(BASE_URL . '/admin/orders.php');
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update_status') {
    $pdo->prepare("UPDATE orders SET status_pesanan=? WHERE id=?")->execute([$_POST['status'], (int)$_POST['id']]);
    flash_set('success', 'Status pesanan diperbarui');
    redirect(BASE_URL . '/admin/orders.php');
}

$detail = null;
if (($_GET['action'] ?? '') === 'detail' && isset($_GET['id'])) {
    $s = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.id=?");
    $s->execute([(int)$_GET['id']]);
    $detail = $s->fetch();
    if ($detail) {
        $items = $pdo->prepare("SELECT * FROM order_items WHERE order_id=?");
        $items->execute([$detail['id']]);
        $detail['items'] = $items->fetchAll();
    }
}

$filter = $_GET['filter'] ?? 'all';
$where = "WHERE 1=1";
if ($filter === 'today') $where .= " AND DATE(o.created_at)=CURDATE()";
elseif ($filter === 'aktif') $where .= " AND o.status_pesanan NOT IN ('selesai','dibatalkan')";

$orders = $pdo->query("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id $where ORDER BY o.id DESC LIMIT 200")->fetchAll();
?>
<div class="card stat-card p-3 mb-3">
  <div class="btn-group">
    <a href="?filter=all" class="btn btn-sm <?= $filter==='all'?'btn-swm':'btn-outline-secondary' ?>">Semua</a>
    <a href="?filter=today" class="btn btn-sm <?= $filter==='today'?'btn-swm':'btn-outline-secondary' ?>">Hari Ini</a>
    <a href="?filter=aktif" class="btn btn-sm <?= $filter==='aktif'?'btn-swm':'btn-outline-secondary' ?>">Aktif</a>
  </div>
</div>

<?php if ($detail): ?>
<div class="card stat-card p-3 mb-3">
  <div class="d-flex justify-content-between"><h6>Detail: <?= e($detail['nomor_pesanan']) ?></h6><a href="<?= BASE_URL ?>/admin/orders.php" class="btn btn-sm btn-outline-secondary">Tutup</a></div>
  <div class="row mt-2">
    <div class="col-md-6">
      <p class="mb-1"><strong>Meja:</strong> <?= e($detail['nomor_meja']) ?></p>
      <p class="mb-1"><strong>Metode:</strong> <?= payment_label($detail['metode_pembayaran']) ?></p>
      <p class="mb-1"><strong>Status Bayar:</strong> <?= e($detail['status_pembayaran']) ?></p>
      <p class="mb-1"><strong>Status Pesanan:</strong> <?= status_label($detail['status_pesanan']) ?></p>
    </div>
    <div class="col-md-6">
      <p class="mb-1"><strong>Total:</strong> <?= rupiah($detail['total']) ?></p>
      <p class="mb-1"><strong>Pajak:</strong> <?= rupiah($detail['pajak']) ?></p>
      <p class="mb-1"><strong>Grand Total:</strong> <?= rupiah($detail['grand_total']) ?></p>
      <p class="mb-1"><strong>Waktu:</strong> <?= date('d M Y H:i', strtotime($detail['created_at'])) ?></p>
    </div>
  </div>
  <table class="table table-sm mt-3">
    <thead><tr><th>Produk</th><th>Harga</th><th>Qty</th><th>Subtotal</th><th>Catatan</th></tr></thead>
    <tbody>
    <?php foreach ($detail['items'] as $it): ?>
      <tr><td><?= e($it['nama_produk']) ?></td><td><?= rupiah($it['harga']) ?></td><td><?= $it['jumlah'] ?></td><td><?= rupiah($it['subtotal']) ?></td><td><?= e($it['catatan']) ?></td></tr>
    <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php endif; ?>

<div class="card stat-card p-3">
  <div class="table-responsive">
    <table class="table table-swm align-middle">
      <thead><tr><th>No. Pesanan</th><th>Meja</th><th>Total</th><th>Metode</th><th>Status Bayar</th><th>Status</th><th>Waktu</th><th>Aksi</th></tr></thead>
      <tbody>
      <?php foreach ($orders as $o): ?>
        <tr>
          <td><?= e($o['nomor_pesanan']) ?></td>
          <td>Meja <?= e($o['nomor_meja']) ?></td>
          <td><?= rupiah($o['grand_total']) ?></td>
          <td><?= payment_label($o['metode_pembayaran']) ?></td>
          <td><span class="badge bg-<?= $o['status_pembayaran']==='diterima'?'success':($o['status_pembayaran']==='dibatalkan'?'danger':'warning') ?>"><?= e($o['status_pembayaran']) ?></span></td>
          <td><?= status_label($o['status_pesanan']) ?></td>
          <td><?= date('d/m H:i', strtotime($o['created_at'])) ?></td>
          <td>
            <a href="?action=detail&id=<?= $o['id'] ?>" class="btn btn-sm btn-outline-info"><i class="fas fa-eye"></i></a>
            <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#m<?= $o['id'] ?>"><i class="fas fa-edit"></i></button>
            <a href="?action=cancel&id=<?= $o['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Batalkan pesanan?')"><i class="fas fa-ban"></i></a>
            <div class="modal fade" id="m<?= $o['id'] ?>"><div class="modal-dialog"><form method="POST" class="modal-content">
              <div class="modal-header"><h6 class="modal-title">Ubah Status — <?= e($o['nomor_pesanan']) ?></h6><button class="btn-close" data-bs-dismiss="modal"></button></div>
              <div class="modal-body">
                <input type="hidden" name="action" value="update_status"><input type="hidden" name="id" value="<?= $o['id'] ?>">
                <select name="status" class="form-select">
                  <?php foreach (['menunggu_pembayaran','pembayaran_diterima','diproses','dimasak','siap_diantar','selesai'] as $s): ?>
                    <option value="<?= $s ?>" <?= $o['status_pesanan']===$s?'selected':'' ?>><?= ucwords(str_replace('_',' ',$s)) ?></option>
                  <?php endforeach; ?>
                </select>
              </div>
              <div class="modal-footer"><button class="btn btn-swm">Simpan</button></div>
            </form></div></div>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
