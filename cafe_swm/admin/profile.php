<?php
$page_title = 'Profil Admin';
require_once __DIR__ . '/../includes/header_admin.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nama = trim($_POST['nama']);
    $username = trim($_POST['username']);
    $password = $_POST['password'] ?? '';
    $foto = $_SESSION['user']['foto'] ?? null;
    if (!empty($_FILES['foto']['name'])) {
        $f = upload_image($_FILES['foto'], 'profile');
        if ($f) $foto = $f;
    }
    if ($password) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE users SET nama=?, username=?, password=?, foto=? WHERE id=?")
            ->execute([$nama, $username, $hash, $foto, $_SESSION['user']['id']]);
    } else {
        $pdo->prepare("UPDATE users SET nama=?, username=?, foto=? WHERE id=?")
            ->execute([$nama, $username, $foto, $_SESSION['user']['id']]);
    }
    $s = $pdo->prepare("SELECT id, username, nama, role, jabatan, foto FROM users WHERE id=?");
    $s->execute([$_SESSION['user']['id']]);
    $_SESSION['user'] = $s->fetch();
    flash_set('success', 'Profil berhasil diperbarui');
    redirect(BASE_URL . '/admin/profile.php');
}
$u = $_SESSION['user'];
?>
<div class="row g-3">
  <div class="col-md-4">
    <div class="card stat-card p-3 text-center">
      <?php if ($u['foto']): ?>
        <img src="<?= img_url($u['foto']) ?>" class="rounded-circle mx-auto mb-2" style="width:120px;height:120px;object-fit:cover;">
      <?php else: ?>
        <div class="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center" style="width:120px;height:120px;background:#d4a373;color:#fff;font-size:3rem;"><?= strtoupper(substr($u['nama'],0,1)) ?></div>
      <?php endif; ?>
      <h5 class="mb-0"><?= e($u['nama']) ?></h5>
      <small class="text-muted">@<?= e($u['username']) ?></small>
    </div>
  </div>
  <div class="col-md-8">
    <div class="card stat-card p-3">
      <h6>Edit Profil</h6>
      <form method="POST" enctype="multipart/form-data">
        <div class="mb-2"><label class="form-label">Nama Lengkap</label><input class="form-control" name="nama" value="<?= e($u['nama']) ?>" required></div>
        <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" value="<?= e($u['username']) ?>" required></div>
        <div class="mb-2"><label class="form-label">Password Baru <small class="text-muted">(opsional)</small></label><input type="password" class="form-control" name="password"></div>
        <div class="mb-3"><label class="form-label">Foto Profil</label><input type="file" class="form-control" name="foto" accept=".jpg,.jpeg,.png,.webp"></div>
        <button class="btn btn-swm">Simpan Perubahan</button>
      </form>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
