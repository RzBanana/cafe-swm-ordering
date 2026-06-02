<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

if (empty($_SESSION['pelanggan_table_id'])) redirect(BASE_URL . '/');
$meja = $_SESSION['pelanggan_meja'];

if (!isset($_SESSION['cart'])) $_SESSION['cart'] = [];

$categories = $pdo->query("SELECT * FROM categories ORDER BY id")->fetchAll();
$selectedCat = (int)($_GET['cat'] ?? 0);

$sql = "SELECT p.*, c.nama AS kategori FROM products p JOIN categories c ON c.id=p.category_id";
if ($selectedCat) { $sql .= " WHERE p.category_id = " . $selectedCat; }
$sql .= " ORDER BY p.status, p.id DESC";
$products = $pdo->query($sql)->fetchAll();

$cartCount = array_sum(array_column($_SESSION['cart'], 'qty'));
?>
<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Menu - <?= APP_NAME ?></title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/[email protected]/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="<?= BASE_URL ?>/assets/css/style.css" rel="stylesheet"></head>
<body>
<div class="pelanggan-header">
  <div class="container d-flex justify-content-between align-items-center">
    <div><h5 class="mb-0"><?= APP_NAME ?></h5><small class="opacity-75">Selamat datang!</small></div>
    <div class="text-end"><span class="table-num">Meja <?= e($meja) ?></span></div>
  </div>
</div>

<div class="container py-3">
  <?= flash_render() ?>
  <div class="d-flex gap-2 mb-3 flex-wrap">
    <a href="?cat=0" class="btn btn-sm <?= !$selectedCat?'btn-swm':'btn-outline-secondary' ?>">Semua</a>
    <?php foreach ($categories as $c): ?>
      <a href="?cat=<?= $c['id'] ?>" class="btn btn-sm <?= $selectedCat==$c['id']?'btn-swm':'btn-outline-secondary' ?>"><?= e($c['nama']) ?></a>
    <?php endforeach; ?>
    <a href="<?= BASE_URL ?>/pelanggan/history.php" class="btn btn-sm btn-outline-dark ms-auto"><i class="fas fa-clock-rotate-left"></i> Riwayat</a>
  </div>

  <div class="row g-3">
    <?php foreach ($products as $p): ?>
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card menu-card <?= $p['status']==='sold_out'?'sold-out':'' ?> h-100 position-relative">
          <?php if ($p['status']==='sold_out'): ?><span class="sold-out-badge">SOLD OUT</span><?php endif; ?>
          <?php if ($p['gambar']): ?>
            <img src="<?= img_url($p['gambar']) ?>" alt="<?= e($p['nama']) ?>">
          <?php else: ?>
            <div style="height:160px;background:linear-gradient(135deg,#f5ebe0,#d4a373);display:flex;align-items:center;justify-content:center;color:#6d4c2e;font-size:3rem;"><i class="fas fa-utensils"></i></div>
          <?php endif; ?>
          <div class="card-body p-3">
            <h6 class="mb-1"><?= e($p['nama']) ?></h6>
            <small class="text-muted d-block mb-2"><?= e($p['deskripsi']) ?></small>
            <div class="d-flex justify-content-between align-items-center">
              <strong style="color:#6d4c2e;"><?= rupiah($p['harga']) ?></strong>
              <?php if ($p['status']==='ready'): ?>
                <button class="btn btn-sm btn-swm" data-bs-toggle="modal" data-bs-target="#add<?= $p['id'] ?>"><i class="fas fa-plus"></i></button>
              <?php else: ?>
                <button class="btn btn-sm btn-secondary" disabled>Habis</button>
              <?php endif; ?>
            </div>
          </div>
        </div>
        <?php if ($p['status']==='ready'): ?>
        <div class="modal fade" id="add<?= $p['id'] ?>">
          <div class="modal-dialog modal-dialog-centered"><form class="modal-content" method="POST" action="<?= BASE_URL ?>/api/cart_action.php">
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="product_id" value="<?= $p['id'] ?>">
            <div class="modal-header"><h6 class="modal-title"><?= e($p['nama']) ?></h6><button class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <p class="mb-1"><?= rupiah($p['harga']) ?></p>
              <p class="text-muted small"><?= e($p['deskripsi']) ?></p>
              <div class="mb-2"><label class="form-label">Jumlah</label><input type="number" name="qty" value="1" min="1" class="form-control"></div>
              <div class="mb-2"><label class="form-label">Catatan (opsional)</label><textarea name="catatan" class="form-control" rows="2" placeholder="Pedas Level 3, Tanpa Bawang, Es Batu Sedikit..."></textarea></div>
            </div>
            <div class="modal-footer"><button class="btn btn-swm">+ Tambah ke Keranjang</button></div>
          </form></div>
        </div>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<?php if ($cartCount > 0): ?>
<a href="<?= BASE_URL ?>/pelanggan/cart.php" class="cart-float"><i class="fas fa-shopping-cart"></i><span class="badge"><?= $cartCount ?></span></a>
<?php endif; ?>
<script src="https://cdn.jsdelivr.net/npm/[email protected]/dist/js/bootstrap.bundle.min.js"></script>
</body></html>
