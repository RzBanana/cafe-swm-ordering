<?php
$page_title = 'Kelola Meja & QR Code';
require_once __DIR__ . '/../includes/header_admin.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nomor = trim($_POST['nomor_meja']);
    if ($_POST['action'] === 'create') {
        $pdo->prepare("INSERT INTO tables_master (nomor_meja) VALUES (?)")->execute([$nomor]);
        flash_set('success', 'Meja ditambah');
    } elseif ($_POST['action'] === 'update') {
        $pdo->prepare("UPDATE tables_master SET nomor_meja=? WHERE id=?")->execute([$nomor, (int)$_POST['id']]);
        flash_set('success', 'Meja diperbarui');
    }
    redirect(BASE_URL . '/admin/tables.php');
}
if (($_GET['action'] ?? '') === 'delete') {
    $pdo->prepare("DELETE FROM tables_master WHERE id=?")->execute([(int)$_GET['id']]);
    flash_set('success', 'Meja dihapus');
    redirect(BASE_URL . '/admin/tables.php');
}
$edit = null;
if (($_GET['action'] ?? '') === 'edit') {
    $stmt = $pdo->prepare("SELECT * FROM tables_master WHERE id=?");
    $stmt->execute([(int)$_GET['id']]);
    $edit = $stmt->fetch();
}
$tables = $pdo->query("SELECT * FROM tables_master ORDER BY nomor_meja")->fetchAll();
?>
<div class="row g-3">
  <div class="col-md-3">
    <div class="card stat-card p-3">
      <h6><?= $edit ? 'Edit Meja' : 'Tambah Meja' ?></h6>
      <form method="POST">
        <input type="hidden" name="action" value="<?= $edit ? 'update' : 'create' ?>">
        <?php if ($edit): ?><input type="hidden" name="id" value="<?= $edit['id'] ?>"><?php endif; ?>
        <div class="mb-3"><label class="form-label">Nomor Meja</label><input class="form-control" name="nomor_meja" required value="<?= e($edit['nomor_meja'] ?? '') ?>" placeholder="contoh: 11"></div>
        <button class="btn btn-swm w-100"><?= $edit ? 'Update' : 'Simpan' ?></button>
        <?php if ($edit): ?><a href="<?= BASE_URL ?>/admin/tables.php" class="btn btn-link w-100">Batal</a><?php endif; ?>
      </form>
    </div>
  </div>
  <div class="col-md-9">
    <div class="card stat-card p-3">
      <h6>Daftar Meja & QR Code</h6>
      <p class="text-muted small">Klik QR untuk preview besar / cetak. URL QR mengarah ke halaman menu pelanggan.</p>
      <div class="row g-3">
        <?php foreach ($tables as $t):
          $url = BASE_URL . '/pelanggan/index.php?meja=' . urlencode($t['nomor_meja']);
          $qr = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($url);
        ?>
          <div class="col-md-3 col-sm-6">
            <div class="card text-center p-3 h-100">
              <h5 class="mb-2">Meja <?= e($t['nomor_meja']) ?></h5>
              <a href="<?= $qr ?>" target="_blank"><img src="<?= $qr ?>" class="img-fluid mb-2" alt="QR Meja <?= e($t['nomor_meja']) ?>"></a>
              <div class="d-flex gap-1 justify-content-center">
                <a href="?action=edit&id=<?= $t['id'] ?>" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i></a>
                <a href="<?= $qr ?>&download=1" download="meja-<?= e($t['nomor_meja']) ?>.png" class="btn btn-sm btn-outline-success"><i class="fas fa-download"></i></a>
                <a href="?action=delete&id=<?= $t['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Hapus meja?')"><i class="fas fa-trash"></i></a>
              </div>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
