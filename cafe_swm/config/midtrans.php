<?php
/**
 * Midtrans Configuration
 *
 * Cara mendapatkan keys:
 * 1. Daftar di https://dashboard.sandbox.midtrans.com/
 * 2. Buka Settings > Access Keys
 * 3. Salin Server Key & Client Key (gunakan SB- untuk sandbox)
 *
 * Untuk PRODUCTION: ubah MIDTRANS_IS_PRODUCTION ke true dan masukkan
 * Server Key & Client Key production Anda.
 */

define('MIDTRANS_IS_PRODUCTION', false);

// === SANDBOX KEYS (ganti dengan key Anda) ===
define('MIDTRANS_SERVER_KEY', 'SB-Mid-server-XXXXXXXXXXXXXXXXXXXX');
define('MIDTRANS_CLIENT_KEY', 'SB-Mid-client-XXXXXXXXXXXXXXXXXXXX');

// Endpoint Snap API
define('MIDTRANS_SNAP_URL',
    MIDTRANS_IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
);

// snap.js untuk frontend
define('MIDTRANS_SNAP_JS',
    MIDTRANS_IS_PRODUCTION
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
);

// Status API base URL
define('MIDTRANS_STATUS_BASE',
    MIDTRANS_IS_PRODUCTION
        ? 'https://api.midtrans.com/v2/'
        : 'https://api.sandbox.midtrans.com/v2/'
);

/**
 * Buat Snap Transaction Token via cURL (tanpa Composer/SDK)
 */
function midtrans_create_snap_token(array $params): array
{
    $payload = json_encode($params);
    $authHeader = 'Basic ' . base64_encode(MIDTRANS_SERVER_KEY . ':');

    $ch = curl_init(MIDTRANS_SNAP_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: ' . $authHeader,
        ],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_SSL_VERIFYPEER => false, // dev/local; aktifkan di produksi dgn cacert
        CURLOPT_TIMEOUT        => 30,
    ]);

    $body = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        return ['success' => false, 'error' => 'cURL error: ' . $err];
    }

    $data = json_decode($body, true);
    if ($http >= 200 && $http < 300 && isset($data['token'])) {
        return ['success' => true, 'token' => $data['token'], 'redirect_url' => $data['redirect_url'] ?? null];
    }

    return [
        'success' => false,
        'error'   => $data['error_messages'][0] ?? $data['status_message'] ?? 'Unknown error',
        'raw'     => $body,
    ];
}

/**
 * Verifikasi signature dari webhook notifikasi
 */
function midtrans_verify_signature(string $orderId, string $statusCode, string $grossAmount, string $signatureKey): bool
{
    $expected = hash('sha512', $orderId . $statusCode . $grossAmount . MIDTRANS_SERVER_KEY);
    return hash_equals($expected, $signatureKey);
}
