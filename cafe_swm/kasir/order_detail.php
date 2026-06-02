<?php
$page_title = 'Detail Pesanan';
require_once __DIR__ . '/../includes/header_kasir.php';

$id = (int)($_GET['id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'];
    if ($action === 'confirm_cash') {
        $uang = (float)$_POST['uang_dibayar'];
        $est  = (int)$_POST['estimasi_waktu'];
        $stmt = $pdo->prepare("SELECT grand_total FROM orders WHERE id=?");
        $stmt->execute([$id]);
        $g = (float)$stmt->fetchColumn();
        $kembalian = $uang - $g;
        if ($uang < $g) {
            flash_set('error', 'Uang dibayar kurang dari total!');
        } else {
            $pdo->prepare("UPDATE orders SET uang_dibayar=?, kembalian=?, status_pembayaran='diterima', status_pesanan='diproses', estimasi_waktu=?, kasir_id=? WHERE id=?")
                ->execute([$uang, $kembalian, $est, $_SESSION['user']['id'], $id]);
            flash_set('success', 'Pembayaran tunai dikonfirmasi. Kembalian: ' . rupiah($kembalian));
        }
    } elseif ($action === 'update_status') {
        $pdo->prepare("UPDATE orders SET status_pesanan=? WHERE id=?")->execute([$_POST['status'], $id]);
        flash_set('success', 'Status diperbarui');
    } elseif ($action === 'set_estimasi') {
        $pdo->prepare("UPDATE orders SET estimasi_waktu=? WHERE id=?")->execute([(int)$_POST['estimasi_waktu'], $id]);
        flash_set('success', 'Estimasi waktu diperbarui');
    }
    redirect(BASE_URL . '/kasir/order_detail.php?id=' . $id);
}

$stmt = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.id=?");
$stmt->execute([$id]);
$order = $stmt->fetch();
if (!$order) { echo '<div class="alert alert-danger">Pesanan tidak ditemukan</div>'; require __DIR__ . '/../includes/footer.php'; exit; }
$items = $pdo->prepare("SELECT * FROM order_items WHERE order_id=?");
$items->execute([$id]); $items = $items->fetchAll();
?>
<div class="row g-3">
  <div class="col-md-7">
    <div class="card stat-card p-3 mb-3">
      <div class="d-flex justify-content-between"><h5 class="mb-0"><?= e($order['nomor_pesanan']) ?></h5><?= status_label($order['status_pesanan']) ?></div>
      <p class="text-muted mb-3">Meja <?= e($order['nomor_meja']) ?> &middot; <?= date('d M Y H:i', strtotime($order['created_at'])) ?></p>
      <table class="table table-sm">
        <thead><tr><th>Produk</th><th>Qty</th><th>Subtotal</th><th>Catatan</th></tr></thead>
        <tbody>
        <?php foreach ($items as $i): ?>
          <tr><td><?= e($i['nama_produk']) ?></td><td><?= $i['jumlah'] ?></td><td><?= rupiah($i['subtotal']) ?></td><td><small><?= e($i['catatan']) ?></small></td></tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <div class="row mt-2">
        <div class="col-6 text-end">Subtotal</div><div class="col-6 text-end"><?= rupiah($order['total']) ?></div>
        <div class="col-6 text-end">Pajak</div><div class="col-6 text-end"><?= rupiah($order['pajak']) ?></div>
        <div class="col-6 text-end"><strong>Grand Total</strong></div><div class="col-6 text-end"><strong><?= rupiah($order['grand_total']) ?></strong></div>
      </div>
      <a class="btn btn-outline-secondary mt-3" target="_blank" href="<?= BASE_URL ?>/pelanggan/receipt.php?id=<?= $order['id'] ?>&print=1"><i class="fas fa-print"></i> Cetak Struk</a>
    </div>
  </div>
  <div class="col-md-5">
    <?php if ($order['metode_pembayaran']==='tunai' && $order['status_pembayaran']==='menunggu'): ?>
      <div class="card stat-card p-3 mb-3">
        <h6>Konfirmasi Pembayaran Tunai</h6>
        <form method="POST" id="cashForm">
          <input type="hidden" name="action" value="confirm_cash">
          <p class="mb-1">Total Tagihan</p>
          <h4><?= rupiah($order['grand_total']) ?></h4>
          <div class="mb-2"><label class="form-label">Uang Dibayar</label><input type="number" name="uang_dibayar" id="uangDibayar" class="form-control" required value="<?= (int)$order['grand_total'] ?>"></div>
          <div class="mb-2 alert alert-info py-2">Kembalian: <strong id="kembalian">Rp 0</strong></div>
          <div class="mb-3"><label class="form-label">Estimasi Waktu (menit)</label>
            <select name="estimasi_waktu" class="form-select"><option>10</option><option selected>15</option><option>20</option><option>30</option></select>
          </div>
          <button class="btn btn-swm w-100">Konfirmasi Pembayaran</button>
        </form>
        <script>
        const total = <?= (int)$order['grand_total'] ?>;
        document.getElementById('uangDibayar').addEventListener('input', function() {
          const k = (parseFloat(this.value)||0) - total;
          document.getElementById('kembalian').textContent = 'Rp ' + (k>=0?k:0).toLocaleString('id-ID');
        });
        </script>
      </div>
    <?php endif; ?>

    <div class="card stat-card p-3 mb-3">
      <h6>Update Status Pesanan</h6>
      <form method="POST">
        <input type="hidden" name="action" value="update_status">
        <select name="status" class="form-select mb-2">
          <?php foreach (['pembayaran_diterima','diproses','dimasak','siap_diantar','selesai'] as $s): ?>
            <option value="<?= $s ?>" <?= $order['status_pesanan']===$s?'selected':'' ?>><?= ucwords(str_replace('_',' ',$s)) ?></option>
          <?php endforeach; ?>
        </select>
        <button class="btn btn-swm w-100">Update Status</button>
      </form>
    </div>

    <div class="card stat-card p-3">
      <h6>Estimasi Waktu</h6>
      <form method="POST" class="d-flex gap-2">
        <input type="hidden" name="action" value="set_estimasi">
        <input type="number" name="estimasi_waktu" class="form-control" value="<?= (int)$order['estimasi_waktu'] ?>">
        <button class="btn btn-swm">Set</button>
      </form>
      <small class="text-muted mt-1 d-block">Saat ini: <?= (int)$order['estimasi_waktu'] ?> menit</small>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
