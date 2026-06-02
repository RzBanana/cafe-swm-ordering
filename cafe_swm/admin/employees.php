<?php
$page_title = 'Kelola Pegawai';
require_once __DIR__ . '/../includes/header_admin.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $nama = trim($_POST['nama']);
    $jabatan = trim($_POST['jabatan']);
    $password = $_POST['password'] ?? '';
    if ($_POST['action'] === 'create') {
        $hash = password_hash($password ?: 'kasir123', PASSWORD_BCRYPT);
        $pdo->prepare("INSERT INTO users (username, password, nama, role, jabatan) VALUES (?,?,?,'kasir',?)")
            ->execute([$username, $hash, $nama, $jabatan]);
        flash_set('success', 'Pegawai ditambah');
    } elseif ($_POST['action'] === 'update') {
        $id = (int)$_POST['id'];
        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $pdo->prepare("UPDATE users SET username=?, nama=?, jabatan=?, password=? WHERE id=?")
                ->execute([$username, $nama, $jabatan, $hash, $id]);
        } else {
            $pdo->prepare("UPDATE users SET username=?, nama=?, jabatan=? WHERE id=?")
                ->execute([$username, $nama, $jabatan, $id]);
        }
        flash_set('success', 'Pegawai diperbarui');
    } elseif ($_POST['action'] === 'reset') {
        $id = (int)$_POST['id'];
        $hash = password_hash('kasir123', PASSWORD_BCRYPT);
        $pdo->prepare("UPDATE users SET password=? WHERE id=?")->execute([$hash, $id]);
        flash_set('success', 'Password direset ke: kasir123');
    }
    redirect(BASE_URL . '/admin/employees.php');
}
if (($_GET['action'] ?? '') === 'delete') {
    $pdo->prepare("DELETE FROM users WHERE id=? AND role='kasir'")->execute([(int)$_GET['id']]);
    flash_set('success', 'Pegawai dihapus');
    redirect(BASE_URL . '/admin/employees.php');
}
$edit = null;
if (($_GET['action'] ?? '') === 'edit') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id=? AND role='kasir'");
    $stmt->execute([(int)$_GET['id']]);
    $edit = $stmt->fetch();
}
$employees = $pdo->query("SELECT * FROM users WHERE role='kasir' ORDER BY id DESC")->fetchAll();
?>
<div class="row g-3">
  <div class="col-md-4">
    <div class="card stat-card p-3">
      <h6><?= $edit ? 'Edit Pegawai' : 'Tambah Pegawai' ?></h6>
      <form method="POST">
        <input type="hidden" name="action" value="<?= $edit ? 'update' : 'create' ?>">
        <?php if ($edit): ?><input type="hidden" name="id" value="<?= $edit['id'] ?>"><?php endif; ?>
        <div class="mb-2"><label class="form-label">Nama Lengkap</label><input class="form-control" name="nama" required value="<?= e($edit['nama'] ?? '') ?>"></div>
        <div class="mb-2"><label class="form-label">Username</label><input class="form-control" name="username" required value="<?= e($edit['username'] ?? '') ?>"></div>
        <div class="mb-2"><label class="form-label">Jabatan</label><input class="form-control" name="jabatan" value="<?= e($edit['jabatan'] ?? '') ?>"></div>
        <div class="mb-3"><label class="form-label">Password <?= $edit ? '<small class="text-muted">(kosongkan jika tidak diubah)</small>' : '' ?></label><input type="password" class="form-control" name="password" <?= $edit ? '' : 'placeholder="default: kasir123"' ?>></div>
        <button class="btn btn-swm w-100"><?= $edit ? 'Update' : 'Simpan' ?></button>
        <?php if ($edit): ?><a href="<?= BASE_URL ?>/admin/employees.php" class="btn btn-link w-100">Batal</a><?php endif; ?>
      </form>
    </div>
  </div>
  <div class="col-md-8">
    <div class="card stat-card p-3">
      <h6>Daftar Pegawai (Kasir)</h6>
      <table class="table table-swm align-middle">
        <thead><tr><th>Nama</th><th>Username</th><th>Jabatan</th><th>Aksi</th></tr></thead>
        <tbody>
        <?php foreach ($employees as $u): ?>
          <tr>
            <td><?= e($u['nama']) ?></td>
            <td><?= e($u['username']) ?></td>
            <td><?= e($u['jabatan']) ?></td>
            <td>
              <a href="?action=edit&id=<?= $u['id'] ?>" class="btn btn-sm btn-outline-primary"><i class="fas fa-edit"></i></a>
              <form method="POST" class="d-inline" onsubmit="return confirm('Reset password jadi kasir123?')">
                <input type="hidden" name="action" value="reset"><input type="hidden" name="id" value="<?= $u['id'] ?>">
                <button class="btn btn-sm btn-outline-warning"><i class="fas fa-key"></i></button>
              </form>
              <a href="?action=delete&id=<?= $u['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Hapus pegawai?')"><i class="fas fa-trash"></i></a>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
<?php require __DIR__ . '/../includes/footer.php'; ?>
