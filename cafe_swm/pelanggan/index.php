<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

$meja = trim($_GET['meja'] ?? '');
if (!$meja) { echo '<div class="alert alert-warning m-4">Silakan scan QR meja yang valid.</div>'; exit; }

$stmt = $pdo->prepare("SELECT * FROM tables_master WHERE nomor_meja=?");
$stmt->execute([$meja]);
$table = $stmt->fetch();
if (!$table) { echo '<div class="alert alert-danger m-4">Meja tidak ditemukan.</div>'; exit; }

$_SESSION['pelanggan_table_id'] = $table['id'];
$_SESSION['pelanggan_meja'] = $table['nomor_meja'];

redirect(BASE_URL . '/pelanggan/menu.php');
