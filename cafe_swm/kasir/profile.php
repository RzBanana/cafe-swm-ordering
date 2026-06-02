<?php
$page_title = 'Profil Kasir';
require_once __DIR__ . '/../includes/header_kasir.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama = trim($_POST['nama']);
    $password = $_POST['password'] ?? '';
    if ($password) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE users SET nama=?, password=? WHERE id=?")->execute([$nama, $hash, $_SESSION['user']['id']]);
    } else {
        $pdo->prepare("UPDATE users SET nama=? WHERE id=?")->execute([$nama, $_SESSION['user']['id']]);
    }
    $_SESSION['user']['nama'] = $nama;
    flash_set('success', 'Profil diperbarui');
    redirect(BASE_URL . '/kasir/profile.php');
}
$u = $_SESSION['user'];
?>
<div class="row justify-content-center">
  <div class="col-md-6">
    <div class="card stat-card p-4 text-center mb-3">
      <div class="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style="width:100px;height:100px;background:#d4a373;color:#fff;font-size:2.5rem;"><?= strtoupper(substr($u['nama'],0,1)) ?></div>
      <h5><?= e($u['nama']) ?></h5>
      <small class="text-muted">@<?= e($u['username']) ?> &middot; <?= e($u['jabatan']) ?></small>
    </div>
    <div class="card stat-card p-3">
      <h6>Edit Profil</h6>
      <form method="POST">
        <div class="mb-2"><label class="form-label">Nama</label><input class="form-control" name="nama" value="<?= e($u['nama']) ?>" required></div>
        <div class="mb-3"><label class="form-label">Password Baru <small class="text-muted">(opsional)</small></label><input type="password" class="form-control" name="password"></div>
        <button class="btn btn-swm w-100">Simpan</button>
      </form>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
