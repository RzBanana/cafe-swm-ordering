<?php
/**
 * Midtrans HTTP Notification Webhook
 *
 * Set URL ini di Midtrans Dashboard > Settings > Configuration:
 *   {BASE_URL}/api/midtrans_notification.php
 */
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/midtrans.php';

header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$orderIdMid     = $data['order_id'] ?? '';
$statusCode     = $data['status_code'] ?? '';
$grossAmount    = $data['gross_amount'] ?? '';
$transactionSt  = $data['transaction_status'] ?? '';
$fraudStatus    = $data['fraud_status'] ?? '';
$paymentType    = $data['payment_type'] ?? '';
$signatureKey   = $data['signature_key'] ?? '';

// Log notifikasi
$pdo->prepare("INSERT INTO midtrans_logs (order_id, transaction_status, fraud_status, status_code, payment_type, gross_amount, raw_payload) VALUES (?,?,?,?,?,?,?)")
    ->execute([$orderIdMid, $transactionSt, $fraudStatus, $statusCode, $paymentType, $grossAmount, $raw]);

// Verifikasi signature
if (!midtrans_verify_signature($orderIdMid, $statusCode, $grossAmount, $signatureKey)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Cari order berdasarkan midtrans_order_id
$stmt = $pdo->prepare("SELECT id FROM orders WHERE midtrans_order_id=?");
$stmt->execute([$orderIdMid]);
$ord = $stmt->fetch();
if (!$ord) {
    http_response_code(404);
    echo json_encode(['error' => 'Order not found']);
    exit;
}
$orderId = (int)$ord['id'];

// Tentukan status berdasarkan transaction_status
$bayar = 'menunggu';
$pesanan = 'menunggu_pembayaran';
if (in_array($transactionSt, ['capture','settlement'])) {
    if ($transactionSt === 'capture' && $fraudStatus === 'challenge') {
        $bayar = 'menunggu';
    } else {
        $bayar = 'diterima';
        $pesanan = 'diproses';
    }
} elseif ($transactionSt === 'pending') {
    $bayar = 'menunggu';
    $pesanan = 'menunggu_pembayaran';
} elseif (in_array($transactionSt, ['deny','expire','cancel'])) {
    $bayar = 'dibatalkan';
    $pesanan = 'dibatalkan';
}

$pdo->prepare("UPDATE orders SET status_pembayaran=?, status_pesanan=? WHERE id=?")
    ->execute([$bayar, $pesanan, $orderId]);

http_response_code(200);
echo json_encode(['status' => 'ok']);
