<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../config/midtrans.php';

$id = (int)($_GET['id'] ?? 0);
$stmt = $pdo->prepare("SELECT o.*, t.nomor_meja FROM orders o JOIN tables_master t ON t.id=o.table_id WHERE o.id=?");
$stmt->execute([$id]);
$order = $stmt->fetch();
if (!$order) { echo '<div class="alert alert-danger m-4">Pesanan tidak ditemukan</div>'; exit; }

$items = $pdo->prepare("SELECT * FROM order_items WHERE order_id=?");
$items->execute([$id]); $items = $items->fetchAll();

$snapToken = $order['midtrans_token'];
$snapError = null;

// Generate Midtrans token jika perlu (untuk QRIS / mobile banking)
if (in_array($order['metode_pembayaran'], ['qris','mobile_banking']) && !$snapToken && $order['status_pembayaran']==='menunggu') {
    $midtransOrderId = $order['nomor_pesanan'] . '-' . substr(bin2hex(random_bytes(2)),0,4);
    $itemDetails = [];
    foreach ($items as $it) {
        $itemDetails[] = [
            'id' => (string)$it['product_id'],
            'price' => (int)$it['harga'],
            'quantity' => (int)$it['jumlah'],
            'name' => mb_substr($it['nama_produk'], 0, 50),
        ];
    }
    if ((int)$order['pajak'] > 0) {
        $itemDetails[] = ['id'=>'tax','price'=>(int)$order['pajak'],'quantity'=>1,'name'=>'Pajak'];
    }
    $enabled = $order['metode_pembayaran']==='qris'
        ? ['gopay','qris','shopeepay']
        : ['bank_transfer','permata_va','bca_va','bni_va','bri_va'];

    $params = [
        'transaction_details' => ['order_id' => $midtransOrderId, 'gross_amount' => (int)$order['grand_total']],
        'item_details'        => $itemDetails,
        'customer_details'    => ['first_name' => 'Pelanggan', 'last_name' => 'Meja ' . $order['nomor_meja']],
        'enabled_payments'    => $enabled,
    ];
    $res = midtrans_create_snap_token($params);
    if ($res['success']) {
        $snapToken = $res['token'];
        $pdo->prepare("UPDATE orders SET midtrans_token=?, midtrans_order_id=? WHERE id=?")
            ->execute([$snapToken, $midtransOrderId, $id]);
    } else {
        $snapError = $res['error'] ?? 'Gagal membuat transaksi Midtrans';
    }
}
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Pembayaran - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head><body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <h5 class="mb-0">Pembayaran</h5>
    <span class="table-num">Meja <?= e($order['nomor_meja']) ?></span>
  </div>
</div>
<div class="container py-3">
  <div class="card stat-card p-3 mb-3 text-center">
    <small class="text-muted">No. Pesanan</small>
    <h5 class="mb-2"><?= e($order['nomor_pesanan']) ?></h5>
    <small class="text-muted">Total Bayar</small>
    <h3 style="color:#6d4c2e;" class="fw-bold mt-1"><?= rupiah($order['grand_total']) ?></h3>
  </div>

  <?php if ($order['metode_pembayaran']==='tunai'): ?>
    <div class="card stat-card p-4 text-center">
      <div class="mb-3"><i class="fas fa-money-bill-wave text-success" style="font-size:3rem;"></i></div>
      <h5>Pembayaran Tunai</h5>
      <p class="mb-1">Silakan menuju kasir untuk melakukan pembayaran</p>
      <span class="badge bg-warning text-dark px-3 py-2">Menunggu Konfirmasi Kasir</span>
      <a href="<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>" class="btn btn-swm mt-4">Lacak Pesanan</a>
    </div>
  <?php elseif ($snapError): ?>
    <div class="alert alert-danger">
      <strong>Midtrans error:</strong> <?= e($snapError) ?>
      <hr><small>Pastikan <code>config/midtrans.php</code> telah diisi Server Key & Client Key dari Midtrans Dashboard sandbox.</small>
    </div>
  <?php elseif ($order['status_pembayaran']==='diterima'): ?>
    <div class="card stat-card p-4 text-center">
      <div class="mb-3"><i class="fas fa-check-circle text-success" style="font-size:3rem;"></i></div>
      <h5>Pembayaran Berhasil</h5>
      <a href="<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>" class="btn btn-swm mt-3">Lacak Pesanan</a>
    </div>
  <?php else: ?>
    <div class="card stat-card p-4 text-center">
      <div class="mb-3"><i class="fas fa-<?= $order['metode_pembayaran']==='qris'?'qrcode text-primary':'university text-warning' ?>" style="font-size:3rem;"></i></div>
      <h5><?= payment_label($order['metode_pembayaran']) ?></h5>
      <p class="text-muted">Klik tombol di bawah untuk melanjutkan pembayaran via Midtrans</p>
      <button id="pay-btn" class="btn btn-swm btn-lg">Bayar Sekarang</button>
      <a href="<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>" class="btn btn-link mt-2">Saya sudah bayar &rarr;</a>
    </div>
    <script src="<?= MIDTRANS_SNAP_JS ?>" data-client-key="<?= MIDTRANS_CLIENT_KEY ?>"></script>
    <script>
    document.getElementById('pay-btn').addEventListener('click', function() {
      snap.pay('<?= e($snapToken) ?>', {
        onSuccess: function(){ window.location='<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>'; },
        onPending: function(){ window.location='<?= BASE_URL ?>/pelanggan/tracking.php?id=<?= $order['id'] ?>'; },
        onError:   function(r){ alert('Pembayaran gagal: ' + JSON.stringify(r)); },
        onClose:   function(){ /* user closed */ }
      });
    });
    </script>
  <?php endif; ?>
</div>
<script src="https://cdn.jsdelivr.net/npm/[email protected]/dist/js/bootstrap.bundle.min.js"></script>
</body></html>
