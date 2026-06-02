<?php
/**
 * Application-wide configuration
 */
define('APP_NAME', 'Cafe SWM');
define('APP_TAGLINE', 'Sistem Informasi Pemesanan');

// Tax / pajak persen (10 = 10%). Set 0 untuk tanpa pajak.
define('TAX_PERCENT', 10);

// Base URL otomatis (sesuai dengan folder instalasi)
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
$base = rtrim(preg_replace('#/(admin|kasir|pelanggan|api)$#', '', $scriptDir), '/');
$proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
define('BASE_URL', $proto . '://' . $host . $base);

// Direktori upload
define('UPLOAD_DIR', __DIR__ . '/../assets/uploads/');
define('UPLOAD_URL', BASE_URL . '/assets/uploads/');

// Timezone
date_default_timezone_set('Asia/Jakarta');

// Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
