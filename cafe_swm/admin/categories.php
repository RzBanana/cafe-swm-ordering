<?php
$page_title = 'Kelola Kategori';
require_once __DIR__ . '/../includes/header_admin.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama = trim($_POST['nama']);
    if ($_POST['action'] === 'create') {
        $pdo->prepare("INSERT INTO categories (nama) VALUES (?)")->execute([$nama]);
        flash_set('success', 'Kategori ditambah');
    } elseif ($_POST['action'] === 'update') {
        $pdo->prepare("UPDATE categories SET nama=? WHERE id=?")->execute([$nama, (int)$_POST['id']]);
        flash_set('success', 'Kategori diperbarui');
    }
    redirect(BASE_URL . '/admin/categories.php');
}
if (($_GET['action'] ?? '') === 'delete' && isset($_GET['id'])) {
    $pdo->prepare("DELETE FROM categories WHERE id=?")->execute([(int)$_GET['id']]);
    flash_set('success', 'Kategori dihapus');
    redirect(BASE_URL . '/admin/categories.php');
}
$edit = null;
if (($_GET['action'] ?? '') === 'edit' && isset($_GET['id'])) {
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id=?");
    $stmt->execute([(int)$_GET['id']]);
    $edit = $stmt->fetch();
}
$items = $pdo->query("SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS total FROM categories c ORDER BY c.id")->fetchAll();
?>
<div class="row g-3">
  <div class="col-md-4">
    <div class="card stat-card p-3">
      <h6><?= $edit ? 'Edit Kategori' : 'Tambah Kategori' ?></h6>
      <form method="POST">
        <input type="hidden" name="action" value="<?= $edit ? 'update' : 'create' ?>">
        <?php if ($edit): ?><input type="hidden" name="id" value="<?= $edit['id'] ?>"><?php endif; ?>
        <div class="mb-3"><label class="form-label">Nama Kategori</label><input class="form-control" name="nama" required value="<?= e($edit['nama'] ?? '') ?>"></div>
        <button class="btn btn-swm w-100"><?= $edit ? 'Update' : 'Simpan' ?></button>
        <?php if ($edit): ?><a href="<?= BASE_URL ?>/admin/categories.php" class="btn btn-link w-100">Batal</a><?php endif; ?>
      </form>
    </div>
  </div>
  <div class="col-md-8">
    <div class="card stat-card p-3">
      <h6>Daftar Kategori</h6>
      <table class="table table-swm">
        <thead><tr><th>#</th><th>Nama</th><th>Jumlah Produk</th><th>Aksi</th></tr></thead>
        <tbody>
        <?php foreach ($items as $i => $c): ?>
          <tr>
            <td><?= $i+1 ?></td>
            <td><?= e($c['nama']) ?></td>
            <td><?= $c['total'] ?></td>
            <td>
              <a href="?action=edit&id=<?= $c['id'] ?>" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i></a>
              <a href="?action=delete&id=<?= $c['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Hapus kategori (produk terkait ikut terhapus)?')"><i class="fas fa-trash"></i></a>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
