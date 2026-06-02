<?php
require_once __DIR__ . '/../includes/auth.php';
require_login('admin');

$type = $_GET['type'] ?? 'daily';
$from = $_GET['from'] ?? date('Y-m-01');
$to   = $_GET['to']   ?? date('Y-m-d');
$month = $_GET['month'] ?? date('Y-m');

if ($type === 'daily') {
    $stmt = $pdo->prepare("SELECT DATE(created_at) periode, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' AND DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY periode");
    $stmt->execute([$from, $to]);
    $rows = $stmt->fetchAll();
    $title = "Laporan_Harian_{$from}_sd_{$to}";
} elseif ($type === 'monthly') {
    $stmt = $pdo->prepare("SELECT DATE_FORMAT(created_at,'%Y-%m') periode, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' AND YEAR(created_at)=? GROUP BY periode ORDER BY periode");
    $stmt->execute([substr($month,0,4)]);
    $rows = $stmt->fetchAll();
    $title = "Laporan_Bulanan_" . substr($month,0,4);
} else {
    $rows = $pdo->query("SELECT YEAR(created_at) periode, COUNT(*) jumlah, SUM(grand_total) total FROM orders WHERE status_pembayaran='diterima' GROUP BY YEAR(created_at) ORDER BY periode")->fetchAll();
    $title = "Laporan_Tahunan";
}

// Output Excel-compatible HTML (.xls)
header("Content-Type: application/vnd.ms-excel; charset=utf-8");
header("Content-Disposition: attachment; filename=\"$title.xls\"");
header("Pragma: no-cache");
header("Expires: 0");
echo "\xEF\xBB\xBF"; // BOM untuk UTF-8
?>
<table border="1">
  <thead>
    <tr><th colspan="3" style="background:#6d4c2e;color:#fff;font-size:16px;">LAPORAN PENDAPATAN <?= strtoupper($type) ?> - CAFE SWM</th></tr>
    <tr><th>Periode</th><th>Jumlah Transaksi</th><th>Total Pendapatan (Rp)</th></tr>
  </thead>
  <tbody>
    <?php
    $totT = 0; $totJ = 0;
    foreach ($rows as $r):
      $totT += $r['total']; $totJ += $r['jumlah'];
    ?>
    <tr><td><?= htmlspecialchars($r['periode']) ?></td><td><?= $r['jumlah'] ?></td><td><?= number_format($r['total'],0,',','.') ?></td></tr>
    <?php endforeach; ?>
    <tr style="font-weight:bold;background:#f5ebe0;"><td>TOTAL</td><td><?= $totJ ?></td><td><?= number_format($totT,0,',','.') ?></td></tr>
  </tbody>
</table>
