# PRD — Sistem Informasi Pemesanan Cafe SWM

## Original Problem Statement
Membangun sistem informasi pemesanan Cafe SWM berbasis web dengan 3 pengguna utama: Pelanggan (scan QR meja, pesan tanpa login), Kasir/Pegawai (login, konfirmasi pembayaran, update status), Admin (akses penuh CRUD + laporan). Total 43 fitur utama. Stack yang diminta user awalnya PHP+MySQL, dikonfirmasi pakai React+FastAPI+MongoDB di Emergent platform.

## User Choices
- **Stack**: React + FastAPI + MongoDB (Opsi A)
- **Pembayaran QRIS**: MOCKED (simulasi tampilan QR + flow). Bisa diganti Midtrans nanti.
- **Auth**: JWT username + password
- **Tema**: Coklat/Cream cafe vibes (warm aesthetic)
- **Default admin**: `admin / admin123`

## Architecture
- **Backend**: FastAPI single-file `/app/backend/server.py`, MongoDB via Motor, JWT (HS256, 7-day exp), bcrypt password hashing. Routes prefix `/api`.
- **Frontend**: React 19 + React Router + Tailwind + Shadcn UI + Recharts + qrcode.react. Cart state in `localStorage`. Auth token in `localStorage.swm_token`.
- **Theme**: Cormorant Garamond (heading) + Outfit (body). Primary: terracotta `hsl(14 53% 49%)`. Background: warm cream.

## Personas
1. **Pelanggan** — Walk-in cafe customer; scans QR or selects table; orders & pays.
2. **Kasir** — Front-of-house staff; confirms cash, updates order status, sees today's revenue.
3. **Admin** — Cafe owner/manager; full CRUD + revenue reports + Excel export.

## Implemented (2026-02)
### Customer (17 features)
✓ Scan/select table (QR `?meja=NN` auto-detect) ✓ Browse menu (3 cats, 9 products, search, filter) ✓ Product detail drawer with qty +/- and notes ✓ Cart with qty/note edit/remove ✓ Sold-out badge & block ✓ Checkout with subtotal/pajak 10%/total ✓ 3 payment methods (Tunai/QRIS-mock/Transfer) ✓ Mock QR display + confirm ✓ Cash "menunggu konfirmasi kasir" state ✓ Transfer instructions ✓ Order tracking with 6-stage timeline ✓ Estimasi waktu display ✓ Digital receipt (printable) ✓ Order history (localStorage-backed)

### Kasir (10 features)
✓ Login (JWT) ✓ Dashboard with KPIs (new/processing/done/revenue) ✓ Today's orders list ✓ Order detail panel ✓ Cash payment dialog with auto change calculator ✓ Estimasi quick-buttons (10/15/20/30 menit) ✓ Status update dropdown (6 statuses) ✓ Cetak struk (new tab to /track) ✓ Riwayat per tanggal with summary ✓ Profile & password

### Admin (16 features)
✓ Login ✓ Dashboard (5 KPIs + 14-day area chart + mini stats) ✓ CRUD Products (with image upload as base64 or URL, sold-out toggle switch) ✓ CRUD Categories (with emoji icon) ✓ CRUD Tables + QR generator (download PNG) ✓ CRUD Employees (admin/kasir roles, reset password) ✓ Orders management (filter by status, view detail, update status, cancel) ✓ Reports (4 tabs: Daily/Monthly/Yearly/By Payment Method) ✓ Charts with Recharts (Area for dashboard, Bar for reports, Pie for methods) ✓ Excel export for daily/monthly/yearly ✓ Profile + photo upload + change password

## Tested
- Backend pytest: 30/30 passing (auth, CRUD, orders, payments, reports, exports)
- Frontend e2e: customer welcome→menu→cart→checkout→tracking; admin login→dashboard→products→tables→reports; kasir login→dashboard→orders
- Test agent verdict: **No critical issues**

## Backlog (P1/P2 — for next iterations)
- **P1**: Real Midtrans integration (replace mock QRIS) — playbook integration when user provides keys
- **P1**: Push notifications / WebSocket for live order updates (currently polls every 5s)
- **P2**: Thermal printer integration (currently uses browser print)
- **P2**: Discount/voucher codes
- **P2**: Multi-branch support
- **P2**: Customer phone/loyalty system
- **P2**: Server-side timezone-aware "today" filter for orders
- **P2**: Audit log (who changed what)
