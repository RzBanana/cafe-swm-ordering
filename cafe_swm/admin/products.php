<?php
$page_title = 'Kelola Produk';
require_once __DIR__ . '/../includes/header_admin.php';

$action = $_GET['action'] ?? 'list';
$id = (int)($_GET['id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama = trim($_POST['nama']);
    $cat = (int)$_POST['category_id'];
    $harga = (float)$_POST['harga'];
    $desk = trim($_POST['deskripsi']);
    $status = $_POST['status'] === 'sold_out' ? 'sold_out' : 'ready';
    $gambar = null;
    if (!empty($_FILES['gambar']['name'])) {
        $gambar = upload_image($_FILES['gambar'], 'products');
    }
    if ($_POST['action'] === 'create') {
        $stmt = $pdo->prepare("INSERT INTO products (nama, category_id, harga, deskripsi, gambar, status) VALUES (?,?,?,?,?,?)");
        $stmt->execute([$nama, $cat, $harga, $desk, $gambar, $status]);
        flash_set('success', 'Produk berhasil ditambah');
    } elseif ($_POST['action'] === 'update') {
        $pid = (int)$_POST['id'];
        if ($gambar) {
            $pdo->prepare("UPDATE products SET nama=?, category_id=?, harga=?, deskripsi=?, gambar=?, status=? WHERE id=?")
                ->execute([$nama, $cat, $harga, $desk, $gambar, $status, $pid]);
        } else {
            $pdo->prepare("UPDATE products SET nama=?, category_id=?, harga=?, deskripsi=?, status=? WHERE id=?")
                ->execute([$nama, $cat, $harga, $desk, $status, $pid]);
        }
        flash_set('success', 'Produk berhasil diperbarui');
    }
    redirect(BASE_URL . '/admin/products.php');
}

if ($action === 'delete' && $id) {
    $pdo->prepare("DELETE FROM products WHERE id=?")->execute([$id]);
    flash_set('success', 'Produk dihapus');
    redirect(BASE_URL . '/admin/products.php');
}

if ($action === 'toggle' && $id) {
    $pdo->prepare("UPDATE products SET status = IF(status='ready','sold_out','ready') WHERE id=?")->execute([$id]);
    flash_set('success', 'Status produk diubah');
    redirect(BASE_URL . '/admin/products.php');
}

$categories = $pdo->query("SELECT * FROM categories ORDER BY nama")->fetchAll();
$edit = null;
if ($action === 'edit' && $id) {
    $edit = $pdo->prepare("SELECT * FROM products WHERE id=?");
    $edit->execute([$id]);
    $edit = $edit->fetch();
}
$products = $pdo->query("SELECT p.*, c.nama AS kategori FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC")->fetchAll();
?>
<div class="row g-3">
  <div class="col-md-4">
    <div class="card stat-card p-3">
      <h6><?= $edit ? 'Edit Produk' : 'Tambah Produk' ?></h6>
      <form method="POST" enctype="multipart/form-data">
        <input type="hidden" name="action" value="<?= $edit ? 'update' : 'create' ?>">
        <?php if ($edit): ?><input type="hidden" name="id" value="<?= $edit['id'] ?>"><?php endif; ?>
        <div class="mb-2"><label class="form-label">Nama Produk</label><input class="form-control" name="nama" required value="<?= e($edit['nama'] ?? '') ?>"></div>
        <div class="mb-2"><label class="form-label">Kategori</label>
          <select class="form-select" name="category_id" required>
            <option value="">-- pilih --</option>
            <?php foreach ($categories as $c): ?>
              <option value="<?= $c['id'] ?>" <?= ($edit && $edit['category_id']==$c['id'])?'selected':'' ?>><?= e($c['nama']) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="mb-2"><label class="form-label">Harga (Rp)</label><input type="number" class="form-control" name="harga" required value="<?= e($edit['harga'] ?? '') ?>"></div>
        <div class="mb-2"><label class="form-label">Deskripsi</label><textarea class="form-control" name="deskripsi" rows="2"><?= e($edit['deskripsi'] ?? '') ?></textarea></div>
        <div class="mb-2"><label class="form-label">Gambar (JPG/PNG/WEBP)</label><input type="file" class="form-control" name="gambar" accept=".jpg,.jpeg,.png,.webp"></div>
        <div class="mb-3"><label class="form-label">Status</label>
          <select class="form-select" name="status">
            <option value="ready" <?= ($edit && $edit['status']==='ready')?'selected':'' ?>>Ready</option>
            <option value="sold_out" <?= ($edit && $edit['status']==='sold_out')?'selected':'' ?>>Sold Out</option>
          </select>
        </div>
        <button class="btn btn-swm w-100"><?= $edit ? 'Update' : 'Simpan' ?></button>
        <?php if ($edit): ?><a href="<?= BASE_URL ?>/admin/products.php" class="btn btn-link w-100">Batal</a><?php endif; ?>
      </form>
    </div>
  </div>
  <div class="col-md-8">
    <div class="card stat-card p-3">
      <h6>Daftar Produk</h6>
      <div class="table-responsive">
        <table class="table table-swm align-middle">
          <thead><tr><th>Foto</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>
          <?php foreach ($products as $p): ?>
            <tr>
              <td><?php if ($p['gambar']): ?><img src="<?= img_url($p['gambar']) ?>" style="width:50px;height:50px;object-fit:cover;border-radius:6px;"><?php else: ?><span class="text-muted">—</span><?php endif; ?></td>
              <td><?= e($p['nama']) ?></td>
              <td><?= e($p['kategori']) ?></td>
              <td><?= rupiah($p['harga']) ?></td>
              <td><?php if ($p['status']==='ready'): ?><span class="badge bg-success">Ready</span><?php else: ?><span class="badge bg-danger">Sold Out</span><?php endif; ?></td>
              <td>
                <a href="?action=toggle&id=<?= $p['id'] ?>" class="btn btn-sm btn-outline-warning" title="Toggle status"><i class="fas fa-exchange-alt"></i></a>
                <a href="?action=edit&id=<?= $p['id'] ?>" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i></a>
                <a href="?action=delete&id=<?= $p['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Hapus produk?')"><i class="fas fa-trash"></i></a>
              </td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
