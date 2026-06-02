<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

if (empty($_SESSION['pelanggan_table_id'])) redirect(BASE_URL . '/');
if (!isset($_SESSION['cart'])) $_SESSION['cart'] = [];

$action = $_POST['action'] ?? '';

if ($action === 'add') {
    $pid = (int)$_POST['product_id'];
    $qty = max(1, (int)($_POST['qty'] ?? 1));
    $catatan = trim($_POST['catatan'] ?? '');
    $stmt = $pdo->prepare("SELECT * FROM products WHERE id=? AND status='ready'");
    $stmt->execute([$pid]);
    $p = $stmt->fetch();
    if (!$p) { flash_set('error', 'Produk tidak tersedia'); redirect(BASE_URL . '/pelanggan/menu.php'); }

    // unique key per (product, catatan)
    $key = $pid . '_' . md5($catatan);
    if (isset($_SESSION['cart'][$key])) {
        $_SESSION['cart'][$key]['qty'] += $qty;
    } else {
        $_SESSION['cart'][$key] = [
            'product_id' => $p['id'],
            'nama' => $p['nama'],
            'harga' => (float)$p['harga'],
            'qty' => $qty,
            'catatan' => $catatan,
        ];
    }
    flash_set('success', 'Ditambahkan ke keranjang');
    redirect(BASE_URL . '/pelanggan/menu.php');
}

if ($action === 'qty') {
    $key = $_POST['key'];
    $op = $_POST['op'];
    if (isset($_SESSION['cart'][$key])) {
        if ($op === 'inc') $_SESSION['cart'][$key]['qty']++;
        elseif ($op === 'dec') $_SESSION['cart'][$key]['qty']--;
        if ($_SESSION['cart'][$key]['qty'] <= 0) unset($_SESSION['cart'][$key]);
    }
    redirect(BASE_URL . '/pelanggan/cart.php');
}

if ($action === 'remove') {
    unset($_SESSION['cart'][$_POST['key']]);
    flash_set('success', 'Produk dihapus dari keranjang');
    redirect(BASE_URL . '/pelanggan/cart.php');
}

redirect(BASE_URL . '/pelanggan/menu.php');
