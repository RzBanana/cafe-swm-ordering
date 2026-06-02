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
✓ Scan/select table (QR `?meja=NN` auto-detect) ✓ Browse menu (3 cats, 9 products, search, filter) ✓ Product detail drawer with qty +/- and notes ✓ Cart with qty/note edit/remove ✓ Sold-out badge & block ✓ Checkout with subtotal/pajak 10%/total ✓ 3 payment methods (Tunai/QRIS-mock/Transfer) ✓ Mock QR display + confirm ✓ Cash "menunggu konfirmasi kasir" state ✓ Transfer instructions ✓ Order tracking with 6-stage timeline ✓ Estimasi waktu display ✓ Digital receipt (printable) ✓ Order history (localStorage-backed) ✓ **Real-time SSE updates** on tracking page (no refresh)

### Kasir (10 features)
✓ Login (JWT) ✓ Dashboard with KPIs ✓ Today's orders list ✓ Order detail panel ✓ Cash payment dialog with auto change calculator ✓ Estimasi quick-buttons ✓ Status update dropdown ✓ **Cetak struk thermal (80mm) + ESC/POS .bin download** ✓ Riwayat per tanggal ✓ Profile & password ✓ **Live new-order toast notifications** via SSE

### Admin (16 features)
✓ Login ✓ Dashboard (5 KPIs + 14-day area chart) ✓ CRUD Products (image upload, sold-out toggle) ✓ CRUD Categories ✓ CRUD Tables + QR generator ✓ CRUD Employees ✓ Orders management (filter, view, update status, cancel) ✓ Reports (Daily/Monthly/Yearly/By Method) ✓ Charts (Recharts) ✓ Excel export ✓ Profile + photo + change password ✓ **Live order list updates** via SSE

### Real-time & Printing (added 2026-02)
✓ Server-Sent Events (SSE) — `/api/events/staff` (all order events) and `/api/events/order/{id}` (per-order) — works through K8s ingress
✓ Native EventSource hook (`useEventStream`) with auto-reconnect
✓ Thermal print page `/print/:orderId` — 80mm monospace layout, auto window.print()
✓ ESC/POS endpoint `GET /api/orders/{id}/escpos` — raw bytes for direct USB/Bluetooth thermal printers (RawBT, lp, etc.)

### Notifications (added 2026-02)
✓ WebAudio chime (3-note bell ding, 880→1100→880 Hz) — `playChime()` / `playUrgentChime()` (double-ring for new orders)
✓ Browser Notification API integration — desktop popup with order summary, click=focus tab + jump to order detail
✓ `NotificationBell` component in dashboard header (desktop+mobile) — toggles for sound/desktop, "Tes Suara" button, permission request flow
✓ Persistent settings via localStorage (`swm_notif_sound`, `swm_notif_desktop`)
✓ Wired into Kasir Orders, Kasir Dashboard, Admin Orders pages on SSE `order_created` event
✓ **Per-status chimes** — distinct WebAudio melody for each transition:
  - Pesanan Baru: urgent double-bell (6 oscillators)
  - Pembayaran Diterima: 2-note rising (cash-register)
  - Diproses: soft single low beep (700 Hz)
  - Dimasak: soft single mid beep (800 Hz)
  - **Siap Diantar**: loud 4-note doorbell repeated 2x (server-call alarm, 8 oscillators)
  - Selesai: 3-note ascending success
✓ `notifyReadyForDelivery()` on Kasir & Admin Orders — fires only on transition (deduplicated)
✓ `notifyCustomerStatus()` on Tracking page — desktop notif when tab hidden, in-tab chime when visible
✓ NotificationBell popover has "Preview per Status" section to familiarize staff with sounds

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
