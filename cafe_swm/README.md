# Cafe SWM - Sistem Informasi Pemesanan

Aplikasi web pemesanan cafe lengkap dengan PHP & MySQL native (tanpa framework, tanpa Composer), terintegrasi pembayaran **Midtrans Snap** (QRIS, GoPay, ShopeePay, Virtual Account, Mobile Banking).

## Fitur Utama (43 fitur)

### A. Pelanggan (17 fitur)
Scan QR Meja, Lihat Menu, Keranjang, Edit Pesanan, Catatan Pesanan, Checkout, Pembayaran Tunai, Pembayaran QRIS (Midtrans), Mobile Banking (Midtrans), Tracking Pesanan, Estimasi Waktu, Notifikasi, Produk Sold Out, Struk Digital, Riwayat Pesanan, Tambah Pesanan Lagi, Detail Pembayaran.

### B. Kasir (10 fitur)
Login, Dashboard, Pesanan Masuk, Konfirmasi Pembayaran Tunai, Hitung Kembalian, Set Estimasi Waktu, Update Status Pesanan, Cetak Struk, Riwayat Pesanan, Rekap Pendapatan.

### C. Admin (16 fitur)
Login, Dashboard + Grafik, Kelola Produk (CRUD + Upload Gambar), Kategori, Meja + Generate QR Code, Pegawai, Pesanan, Pembayaran, Status Sold Out, Laporan Harian/Bulanan/Tahunan, Grafik Chart.js, Export Excel, Profil Admin.

---

## Persyaratan Sistem

- PHP **7.4+** atau **8.x** (dengan ekstensi: `pdo_mysql`, `curl`, `gd` opsional)
- MySQL/MariaDB **5.7+**
- Web server: Apache (XAMPP/Laragon) atau Nginx
- Koneksi internet (untuk Midtrans & CDN Bootstrap/Chart.js)

---

## Cara Instalasi

### 1. Ekstrak file ZIP
Letakkan folder `cafe_swm` di:
- **XAMPP:** `C:\xampp\htdocs\cafe_swm`
- **Laragon:** `C:\laragon\www\cafe_swm`

### 2. Import Database
1. Jalankan XAMPP/Laragon (Apache + MySQL ON).
2. Buka `http://localhost/phpmyadmin`
3. Klik **New** → buat database `cafe_swm`
4. Klik tab **Import** → pilih file `database/cafe_swm.sql` → **Go**

### 3. Konfigurasi
Edit `config/database.php` jika perlu:
```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'cafe_swm');
define('DB_USER', 'root');
define('DB_PASS', '');
```

### 4. Konfigurasi Midtrans
1. Daftar/Login di https://dashboard.sandbox.midtrans.com/
2. Buka **Settings → Access Keys**
3. Salin **Server Key** & **Client Key**
4. Edit `config/midtrans.php`:
```php
define('MIDTRANS_SERVER_KEY', 'SB-Mid-server-XXXXXXXXXXXXXXXXXXXX');
define('MIDTRANS_CLIENT_KEY', 'SB-Mid-client-XXXXXXXXXXXXXXXXXXXX');
```
5. Di Midtrans Dashboard, set **Payment Notification URL**:
```
http://<domain-anda>/cafe_swm/api/midtrans_notification.php
```
> Untuk testing lokal, gunakan tools seperti **ngrok** atau **localtunnel** agar webhook bisa diakses dari internet.

### 5. Akses Aplikasi
Buka di browser:
```
http://localhost/cafe_swm/
```

---

## Kredensial Demo

| Role     | Username | Password   |
|----------|----------|------------|
| Admin    | admin    | admin123   |
| Kasir 1  | kasir1   | kasir123   |
| Kasir 2  | kasir2   | kasir123   |

Pelanggan: scan QR atau buka link dengan parameter `?meja=01` … `?meja=10`.

---

## Struktur Folder

```
cafe_swm/
├── admin/              # Modul Admin (login, dashboard, CRUD, laporan)
├── kasir/              # Modul Kasir (login, pesanan, kembalian, rekap)
├── pelanggan/          # Modul Pelanggan (menu, keranjang, checkout, tracking, struk)
├── api/                # Endpoint API & webhook Midtrans
├── config/             # Konfigurasi DB & Midtrans
├── includes/           # Header, footer, helper, auth
├── assets/             # CSS, JS, gambar upload
├── database/           # Schema SQL & seed data
├── index.php           # Landing page
└── README.md
```

---

## Pembayaran (Midtrans)

- **Tunai:** dibayar di kasir, status `menunggu` sampai kasir mengonfirmasi.
- **QRIS / GoPay / ShopeePay:** Midtrans Snap akan menampilkan QR untuk discan.
- **Mobile Banking:** Midtrans menyediakan Virtual Account (BCA/BNI/BRI/Permata/dll).

Status pembayaran online akan otomatis terupdate melalui webhook `api/midtrans_notification.php`.

### Tes Kartu/E-Wallet (Sandbox)
- Kartu test: `4811 1111 1111 1114` (CVV `123`, OTP `112233`)
- Untuk QRIS sandbox: gunakan simulator Midtrans di https://simulator.sandbox.midtrans.com/

---

## Tips Produksi

1. Ubah `MIDTRANS_IS_PRODUCTION` di `config/midtrans.php` menjadi `true` & ganti key production.
2. Pastikan `https://` aktif di domain Anda (Midtrans mensyaratkan HTTPS untuk webhook produksi).
3. Aktifkan `CURLOPT_SSL_VERIFYPEER => true` di `config/midtrans.php`.
4. Set `display_errors = Off` di `php.ini`.
5. Backup database secara berkala.

---

## Lisensi
Bebas digunakan untuk proyek edukasi / komersial. Dibuat dengan ❤ oleh Emergent.
