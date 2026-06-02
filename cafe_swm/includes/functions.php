<?php
/**
 * Helper functions
 */

function e(?string $str): string {
    return htmlspecialchars($str ?? '', ENT_QUOTES, 'UTF-8');
}

function rupiah($n): string {
    return 'Rp ' . number_format((float)$n, 0, ',', '.');
}

function redirect(string $url): void {
    header("Location: $url");
    exit;
}

function flash_set(string $type, string $msg): void {
    $_SESSION['flash'] = ['type' => $type, 'msg' => $msg];
}

function flash_get(): ?array {
    if (!empty($_SESSION['flash'])) {
        $f = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $f;
    }
    return null;
}

function flash_render(): string {
    $f = flash_get();
    if (!$f) return '';
    $cls = $f['type'] === 'success' ? 'alert-success' : ($f['type'] === 'error' ? 'alert-danger' : 'alert-info');
    return '<div class="alert ' . $cls . ' alert-dismissible fade show" role="alert">'
        . e($f['msg'])
        . '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
}

function generate_order_number(): string {
    return 'SWM-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
}

function status_label(string $status): string {
    $map = [
        'menunggu_pembayaran' => ['Menunggu Pembayaran', 'secondary'],
        'pembayaran_diterima' => ['Pembayaran Diterima', 'info'],
        'diproses'            => ['Sedang Diproses', 'primary'],
        'dimasak'             => ['Sedang Dimasak', 'warning'],
        'siap_diantar'        => ['Siap Diantar', 'success'],
        'selesai'             => ['Selesai', 'dark'],
        'dibatalkan'          => ['Dibatalkan', 'danger'],
    ];
    [$text, $color] = $map[$status] ?? [$status, 'secondary'];
    return '<span class="badge bg-' . $color . '">' . $text . '</span>';
}

function payment_label(string $method): string {
    $map = [
        'tunai'          => 'Tunai',
        'qris'           => 'QRIS',
        'mobile_banking' => 'Mobile Banking',
    ];
    return $map[$method] ?? $method;
}

function upload_image(array $file, string $subdir = 'products'): ?string {
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) return null;
    $allowed = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!isset($allowed[$ext])) return null;
    $dir = UPLOAD_DIR . $subdir . '/';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $fname = uniqid('img_') . '.' . $ext;
    $target = $dir . $fname;
    if (!move_uploaded_file($file['tmp_name'], $target)) return null;
    return $subdir . '/' . $fname;
}

function img_url(?string $path): string {
    if (!$path) return BASE_URL . '/assets/img/placeholder.png';
    return UPLOAD_URL . $path;
}
