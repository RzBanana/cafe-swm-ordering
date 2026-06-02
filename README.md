# ☕ Sistem Informasi Pemesanan Cafe SWM

Aplikasi web full-stack untuk pemesanan cafe dengan 3 role pengguna (Pelanggan, Kasir, Admin), real-time notifications (SSE + Web Push), QR code per meja, thermal printer support, dan laporan dengan export Excel.

---

## 📋 Daftar Isi
1. [Tech Stack](#-tech-stack)
2. [Prasyarat Sistem](#-prasyarat-sistem)
3. [Instalasi](#-instalasi)
4. [Konfigurasi Environment](#-konfigurasi-environment)
5. [Menjalankan Aplikasi](#-menjalankan-aplikasi)
6. [Akun Default](#-akun-default)
7. [Struktur Folder](#-struktur-folder)
8. [Fitur Lengkap](#-fitur-lengkap)
9. [Endpoint API](#-endpoint-api-utama)
10. [Setup Web Push (VAPID)](#-setup-web-push-vapid)
11. [Troubleshooting](#-troubleshooting)
12. [Deployment Production](#-deployment-production)

---

## 🛠️ Tech Stack

### Backend
- **Python 3.11+** — Bahasa pemrograman
- **FastAPI** — Web framework
- **MongoDB** — Database (via Motor async driver)
- **PyJWT + bcrypt** — Authentication
- **pywebpush** — Web Push Notification
- **openpyxl** — Export Excel

### Frontend
- **React 19** — UI library
- **React Router v6** — Routing
- **Tailwind CSS + Shadcn UI** — Styling & components
- **Recharts** — Charts/grafik
- **qrcode.react** — Generate QR code
- **axios** — HTTP client
- **Sonner** — Toast notifications

---

## ✅ Prasyarat Sistem

Pastikan komputer Anda sudah terinstall:

| Software | Versi Minimum | Cara Cek | Link Download |
|----------|---------------|----------|---------------|
| **Node.js** | 18.x | `node -v` | https://nodejs.org |
| **Yarn** | 1.22+ | `yarn -v` | `npm install -g yarn` |
| **Python** | 3.11+ | `python3 --version` | https://python.org |
| **pip** | 22+ | `pip --version` | (sudah include di Python) |
| **MongoDB** | 6.0+ | `mongod --version` | https://mongodb.com/try/download/community |
| **Git** (opsional) | 2.x | `git --version` | https://git-scm.com |

> 💡 **Tips Windows**: Install MongoDB Community Server lalu jalankan sebagai Windows Service. Atau gunakan **MongoDB Atlas** (cloud, gratis) di https://cloud.mongodb.com

---

## 📥 Instalasi

### 1. Dapatkan Source Code

**Opsi A — Dari ZIP/GitHub:**
```bash
# Extract ZIP atau clone dari GitHub
git clone <url-repo-anda>
cd cafe-swm
```

**Opsi B — Dari Emergent (lihat README sebelumnya):**
Push ke GitHub via tombol "Save to GitHub" → download ZIP dari GitHub.

### 2. Setup Backend

```bash
cd backend

# (Opsional tapi disarankan) Buat virtual environment
python3 -m venv venv

# Aktifkan virtual env
# Linux / macOS:
source venv/bin/activate
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (CMD):
venv\Scripts\activate.bat

# Install semua dependency
pip install -r requirements.txt
```

### 3. Setup Frontend

```bash
cd ../frontend

# Install dependencies pakai YARN (jangan npm)
yarn install
```

> ⚠️ **Penting**: Gunakan `yarn` bukan `npm install`. Mixing keduanya bisa cause dependency conflicts.

### 4. Setup MongoDB

**Pilih salah satu cara:**

#### A. MongoDB Lokal (Recommended untuk Development)
```bash
# Linux / macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Linux (apt)
sudo apt install mongodb
sudo systemctl start mongodb

# Windows: install dari https://mongodb.com/try/download/community
# Pastikan MongoDB service running di port 27017
```

Verifikasi MongoDB jalan:
```bash
mongosh --eval "db.version()"
```

#### B. MongoDB Atlas (Cloud, Gratis)
1. Daftar di https://cloud.mongodb.com
2. Buat cluster gratis (M0)
3. Whitelist IP Anda (atau `0.0.0.0/0` untuk akses semua)
4. Buat database user
5. Copy connection string (format: `mongodb+srv://user:pass@cluster.mongodb.net/`)
6. Paste ke `MONGO_URL` di `backend/.env`

---

## ⚙️ Konfigurasi Environment

### Backend — `/backend/.env`

Buat/edit file `backend/.env`:

```ini
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cafe_swm_database"

# CORS — origin yang diizinkan akses API (* = semua, production: specific origin)
CORS_ORIGINS="*"

# JWT Secret — GANTI ke string random 64+ char untuk production!
JWT_SECRET="b8f4a3e7d2c5198a76fd0c34e8b9a5d1f6e3c7b2a4d8e5f1c9b6a3d7e2f4c8a5"

# Akun default (di-seed otomatis di first run)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
KASIR_USERNAME="kasir"
KASIR_PASSWORD="kasir123"

# Pajak (decimal: 0.10 = 10%)
TAX_RATE="0.10"

# Web Push VAPID Keys (untuk push notification)
# Generate keys baru untuk production (lihat section "Setup Web Push" di bawah)
VAPID_PUBLIC_KEY="BPLufaxfoPq9YQseiYF6RbaESaCpgBL_aeIAfZ__TJLhudzIanLs7suyE1ce938B8LKZwNUluGdHD8BY0N8rci0"
VAPID_PRIVATE_KEY="vZUFVIkbg5_6s8obmN7bZhawHu0M51QsVE6nLSEjrc0"
VAPID_SUBJECT="mailto:admin@swm-cafe.local"
```

### Frontend — `/frontend/.env`

```ini
# URL backend (tanpa trailing slash, tanpa /api)
REACT_APP_BACKEND_URL=http://localhost:8001
```

Untuk production, ganti dengan domain server Anda, contoh:
```ini
REACT_APP_BACKEND_URL=https://api.cafeswm.com
```

---

## ▶️ Menjalankan Aplikasi

### Mode Development

Buka **2 terminal** terpisah:

**Terminal 1 — Backend:**
```bash
cd backend
# Aktifkan venv jika belum
source venv/bin/activate  # atau venv\Scripts\activate di Windows

# Jalankan dengan auto-reload
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend siap di: **http://localhost:8001**
API docs (Swagger): **http://localhost:8001/docs**

**Terminal 2 — Frontend:**
```bash
cd frontend
yarn start
```

Frontend siap di: **http://localhost:3000**

Buka browser ke **http://localhost:3000** dan mulai menggunakan aplikasi! 🎉

### Mode Production (Build)

```bash
# Build frontend statis
cd frontend
yarn build
# → output di /frontend/build/

# Backend (gunakan gunicorn untuk production)
cd ../backend
pip install gunicorn uvicorn[standard]
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001
```

Serve folder `frontend/build/` lewat nginx/apache, dan reverse-proxy `/api/*` ke backend port 8001.

---

## 🔑 Akun Default

Setelah backend pertama kali jalan, data berikut akan di-seed otomatis:

| Role | Username | Password | Akses |
|------|----------|----------|-------|
| **Admin** | `admin` | `admin123` | Full access (CRUD produk, pegawai, laporan, dll) |
| **Kasir** | `kasir` | `kasir123` | Konfirmasi pembayaran, update status pesanan |
| **Pelanggan** | — | — | Tidak perlu login. Akses via scan QR / pilih meja |

⚠️ **Ganti password segera** setelah login pertama lewat menu Profil!

### Seed Data Otomatis
Saat first run, backend akan auto-seed:
- 3 kategori (Makanan, Minuman, Snack)
- 9 produk sample (Nasi Goreng, Kopi Susu, Kentang Goreng, dll)
- 10 meja (01-10) dengan QR code
- Akun admin + kasir

---

## 📁 Struktur Folder

```
cafe-swm/
├── backend/
│   ├── server.py              # Single-file FastAPI app (50+ endpoint)
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Backend config (JWT, MongoDB, VAPID)
│   └── uploads/               # Upload directory (opsional)
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── service-worker.js  # Push notification handler
│   ├── src/
│   │   ├── App.js             # Main router
│   │   ├── index.js           # Entry point
│   │   ├── index.css          # Tailwind + theme (warna cafe)
│   │   ├── App.css
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn components (button, input, dll)
│   │   │   ├── layouts/
│   │   │   │   └── DashboardLayout.jsx
│   │   │   └── NotificationBell.jsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js              # Axios instance
│   │   │   ├── useEventStream.js   # SSE hook
│   │   │   ├── notifications.js    # WebAudio chimes
│   │   │   └── push.js             # Web Push subscribe
│   │   └── pages/
│   │       ├── customer/      # Welcome, Menu, Cart, Tracking, History
│   │       ├── auth/          # Login
│   │       ├── kasir/         # Dashboard, Orders, History
│   │       ├── admin/         # Dashboard, Products, Categories, Tables, Employees, Orders, Reports, Profile
│   │       └── ThermalReceipt.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── craco.config.js
│   └── .env                   # Frontend config
│
├── memory/
│   ├── PRD.md                 # Dokumentasi product requirements
│   └── test_credentials.md    # Daftar akun test
│
└── README.md                  # File ini
```

---

## 🎯 Fitur Lengkap

### 👤 Modul Pelanggan (17 fitur)
- Scan QR Code meja (auto-detect via URL `?meja=01`)
- Browse menu (3 kategori, search, filter)
- Detail produk dengan foto, deskripsi, qty +/-, dan catatan
- Keranjang dengan edit qty/note/hapus
- Badge "Sold Out" untuk produk habis
- Checkout dengan pajak otomatis (10%)
- 3 metode pembayaran: Tunai, QRIS (mock), Mobile Banking
- Tracking real-time 6 stage (Menunggu Pembayaran → Selesai)
- Estimasi waktu
- Struk digital + thermal print
- Riwayat pesanan (per device)
- Notifikasi real-time (SSE) + Web Push opsional

### 💵 Modul Kasir (10 fitur)
- Login dengan JWT
- Dashboard real-time (Pesanan Baru, Diproses, Selesai, Pendapatan)
- Daftar pesanan masuk
- Konfirmasi pembayaran tunai (auto-hitung kembalian)
- Input estimasi waktu (quick buttons: 10/15/20/30 menit)
- Update status pesanan
- Cetak struk thermal (80mm) + download ESC/POS .bin
- Riwayat transaksi per tanggal
- Rekap pendapatan harian
- Profil + ganti password
- Notifikasi suara + desktop + Web Push per status

### 🛠️ Modul Admin (16 fitur)
- Login & dashboard dengan KPI + chart 14 hari
- CRUD Produk (upload gambar JPG/PNG/WebP, toggle status sold out)
- CRUD Kategori (dengan emoji icon)
- CRUD Meja + Generate QR Code (download PNG)
- CRUD Pegawai (admin/kasir, reset password)
- Kelola Pesanan (filter, view detail, update status, batalkan)
- Laporan Harian / Bulanan / Tahunan / Per Metode Bayar
- Grafik dengan Recharts (Area, Bar, Pie)
- **Export Excel** semua laporan (.xlsx)
- Profil + foto + ganti password
- Real-time SSE updates

### 🔔 Fitur Tambahan
- **Real-time SSE** (Server-Sent Events) — auto-refresh tanpa polling
- **Web Push Notification** (VAPID) — notif walau browser ditutup
- **6 chime per status** dengan WebAudio (siap diantar = alarm doorbell 8 oscillator)
- **Thermal printer ESC/POS** — print direct via 80mm thermal printer

---

## 🌐 Endpoint API Utama

### Public (no auth)
```
GET    /api/categories
GET    /api/products
GET    /api/tables
POST   /api/orders                    # Buat pesanan
GET    /api/orders/{id}               # Tracking pesanan
POST   /api/orders/{id}/qris-pay      # Konfirmasi QRIS (mock)
GET    /api/events/staff              # SSE all events
GET    /api/events/order/{id}         # SSE per-order
GET    /api/push/vapid-public-key
POST   /api/push/subscribe
POST   /api/push/unsubscribe
GET    /api/orders/{id}/escpos        # Download ESC/POS .bin
```

### Auth
```
POST   /api/auth/login                # → JWT token
GET    /api/auth/me
POST   /api/auth/change-password
PATCH  /api/auth/profile
```

### Staff (kasir/admin auth required)
```
GET    /api/orders                    # Daftar semua pesanan
PATCH  /api/orders/{id}/status        # Update status
POST   /api/orders/{id}/cash-pay      # Konfirm tunai + kembalian
GET    /api/reports/summary
GET    /api/reports/daily
GET    /api/reports/monthly
GET    /api/reports/yearly
GET    /api/reports/by-method
GET    /api/reports/export            # Excel download
```

### Admin only
```
POST/PATCH/DELETE /api/products
POST/PATCH/DELETE /api/categories
POST/PATCH/DELETE /api/tables
POST/PATCH/DELETE /api/employees
```

📖 **Dokumentasi lengkap interactive**: buka http://localhost:8001/docs setelah backend jalan.

---

## 🔐 Setup Web Push (VAPID)

VAPID keys di `.env` bersifat **default**. Untuk production, generate keys Anda sendiri:

```bash
cd backend
python3 -c "
from py_vapid import Vapid01
from cryptography.hazmat.primitives import serialization
import base64

v = Vapid01()
v.generate_keys()

pub = v._public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint,
)
priv = v._private_key.private_numbers().private_value.to_bytes(32, 'big')

print('VAPID_PUBLIC_KEY=' + base64.urlsafe_b64encode(pub).decode().rstrip('='))
print('VAPID_PRIVATE_KEY=' + base64.urlsafe_b64encode(priv).decode().rstrip('='))
"
```

Copy output ke `backend/.env`. Restart backend.

⚠️ **Catatan**: Mengganti VAPID keys akan **invalidate semua subscription existing** (user harus subscribe ulang).

---

## 🛟 Troubleshooting

### ❌ Backend tidak start: "ModuleNotFoundError"
```bash
# Pastikan venv aktif & install ulang
pip install -r requirements.txt
```

### ❌ "MongoServerSelectionTimeoutError"
- Cek MongoDB jalan: `mongosh --eval "db.version()"`
- Cek `MONGO_URL` di `backend/.env`
- Untuk MongoDB Atlas, pastikan IP Anda di-whitelist

### ❌ Frontend error: "Network Error" saat call API
- Cek `REACT_APP_BACKEND_URL` di `frontend/.env`
- Pastikan backend jalan di port 8001
- Cek CORS: `CORS_ORIGINS` di backend harus include URL frontend

### ❌ Push notification tidak masuk
- Pastikan HTTPS (Web Push butuh HTTPS, kecuali localhost untuk dev)
- Cek izin Notification di browser (Settings → Privacy → Notifications)
- Cek service worker terdaftar: DevTools → Application → Service Workers
- Cek VAPID keys benar (re-subscribe jika baru ganti keys)

### ❌ Port 8001 / 3000 sudah dipakai
```bash
# Linux/Mac — cari & kill process
lsof -i :8001
kill -9 <PID>

# Windows
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

Atau ganti port:
```bash
# Backend port 8002
uvicorn server:app --port 8002
# Frontend port 3001 (cross-platform)
PORT=3001 yarn start
```

### ❌ QR Code meja tidak terbaca
- Pastikan URL di QR mengarah ke domain yang benar
- Format URL: `https://yoursite.com/?meja=01`
- Re-generate QR di Admin → Kelola Meja → tombol QR

### ❌ Excel export error
```bash
pip install --upgrade openpyxl
```

---

## 🚀 Deployment Production

### Opsi 1: VPS (DigitalOcean / Vultr / dll)
1. Setup Ubuntu 22.04 server
2. Install Nginx, Node.js, Python, MongoDB
3. Clone repo & build frontend (`yarn build`)
4. Setup systemd service untuk backend (uvicorn/gunicorn)
5. Nginx reverse proxy:
   - `/` → serve `frontend/build/`
   - `/api/*` → proxy ke `localhost:8001`
6. Setup HTTPS dengan Let's Encrypt (certbot)

### Opsi 2: PaaS (Railway / Render / Fly.io)
- Backend: deploy folder `/backend` dengan `requirements.txt`
- Frontend: deploy folder `/frontend` dengan build command `yarn build`
- Database: pakai MongoDB Atlas

### Opsi 3: Docker
```bash
# Build & run dengan docker-compose
# (file docker-compose.yml perlu dibuat sendiri)
```

### ✅ Checklist Production
- [ ] Ganti `JWT_SECRET` ke string random panjang
- [ ] Generate VAPID keys baru
- [ ] Set `CORS_ORIGINS` ke domain frontend spesifik (jangan `*`)
- [ ] Ganti password `admin` dan `kasir`
- [ ] Setup HTTPS (wajib untuk Web Push)
- [ ] Setup MongoDB authentication
- [ ] Setup backup database harian
- [ ] Monitor logs (Sentry, LogRocket, dll)

---

## 📝 Tips & Best Practices

- **Backup MongoDB rutin**: `mongodump --uri "$MONGO_URL" --out backup-$(date +%F)`
- **Restore**: `mongorestore --uri "$MONGO_URL" backup-YYYY-MM-DD/`
- **Monitor logs backend**: pakai `journalctl -u cafe-swm-backend -f` (systemd) atau Docker logs
- **Pasang printer thermal**: install printer di OS sebagai default → struk di `/print/:orderId` akan auto-print

---

## 📞 Support & Contributing

- 🐛 **Bug report**: buka issue di GitHub repository
- 💬 **Questions**: support@emergent.sh
- 🤝 **Contributions**: Welcome! Fork → PR

---

## 📜 Lisensi

Project ini dibuat untuk keperluan pribadi/komersial Cafe SWM. Bebas digunakan & dimodifikasi.

---

**Built with ☕ using Emergent Platform**

Selamat menggunakan! Semoga sukses dengan cafe-nya 🚀
