/**
 * Notification utilities for new-order alerts.
 *
 * - WebAudio chime (no asset file needed — generated at runtime, ~85% volume)
 * - Browser Notification API for desktop popups when tab is inactive
 * - Settings persisted in localStorage (`swm_notif_sound`, `swm_notif_desktop`)
 */

const KEY_SOUND = "swm_notif_sound";
const KEY_DESKTOP = "swm_notif_desktop";

export const notifSettings = {
  get sound() {
    return localStorage.getItem(KEY_SOUND) !== "off";
  },
  set sound(v) {
    localStorage.setItem(KEY_SOUND, v ? "on" : "off");
  },
  get desktop() {
    return localStorage.getItem(KEY_DESKTOP) !== "off";
  },
  set desktop(v) {
    localStorage.setItem(KEY_DESKTOP, v ? "on" : "off");
  },
};

// ---------- WebAudio chime ----------
let _ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) _ctx = new AC();
  // Some browsers suspend until user gesture; this resume is best-effort.
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

function beep(ctx, freq, startAt, durationSec = 0.18, gain = 0.6) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startAt);
  // Quick attack + decay to give a "ding" character
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

/** Play a loud 3-note bell chime (≈0.7s total). Used for testing & new orders. */
export function playChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  beep(ctx, 880, t + 0.0);
  beep(ctx, 1100, t + 0.22);
  beep(ctx, 880, t + 0.44);
}

/** Play the chime twice in a row — used for new orders so it's hard to miss. */
export function playUrgentChime() {
  if (!notifSettings.sound) return;
  playChime();
  setTimeout(playChime, 800);
}

// ---------- Per-status chimes ----------

/** "Ready to deliver" alarm — distinctive 4-note doorbell pattern, loud & high.
 *  Used for `siap_diantar` so waitstaff can't miss it. */
export function playReadyChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // G6 → E6 → G6 → C7 — bright doorbell motif
  beep(ctx, 1568, t + 0.0, 0.16, 0.7);
  beep(ctx, 1318, t + 0.18, 0.16, 0.7);
  beep(ctx, 1568, t + 0.36, 0.16, 0.7);
  beep(ctx, 2093, t + 0.54, 0.28, 0.7);
  // Repeat once after a short pause — server staff is moving around
  setTimeout(() => {
    const ctx2 = getCtx();
    if (!ctx2) return;
    const t2 = ctx2.currentTime;
    beep(ctx2, 1568, t2 + 0.0, 0.16, 0.7);
    beep(ctx2, 1318, t2 + 0.18, 0.16, 0.7);
    beep(ctx2, 1568, t2 + 0.36, 0.16, 0.7);
    beep(ctx2, 2093, t2 + 0.54, 0.28, 0.7);
  }, 1100);
}

/** Payment received — cheerful rising "cash-register" 2-note (C6 → E6). */
export function playPaidChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  beep(ctx, 1046, t + 0.0, 0.14, 0.55);
  beep(ctx, 1318, t + 0.16, 0.22, 0.6);
}

/** Diproses — single soft low beep. */
export function playProcessChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  beep(ctx, 700, ctx.currentTime, 0.18, 0.4);
}

/** Dimasak — single soft mid beep. */
export function playCookingChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  beep(ctx, 800, ctx.currentTime, 0.18, 0.4);
}

/** Selesai — 3-note ascending success (C6 → E6 → G6). */
export function playSuccessChime() {
  if (!notifSettings.sound) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  beep(ctx, 1046, t + 0.0, 0.14, 0.55);
  beep(ctx, 1318, t + 0.14, 0.14, 0.55);
  beep(ctx, 1568, t + 0.28, 0.22, 0.6);
}

/** Dispatch a chime based on order status string. Returns true if it played. */
export function playStatusChime(status) {
  switch (status) {
    case "pembayaran_diterima":
      playPaidChime();
      return true;
    case "diproses":
      playProcessChime();
      return true;
    case "dimasak":
      playCookingChime();
      return true;
    case "siap_diantar":
      playReadyChime();
      return true;
    case "selesai":
      playSuccessChime();
      return true;
    default:
      return false;
  }
}

// ---------- Browser Notifications ----------
export function notifPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotifPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return Notification.permission;
  }
}

export function showDesktopNotif(title, body, onClick) {
  if (!notifSettings.desktop) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "swm-order", // collapses duplicate spam
      renotify: true,
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      try { onClick?.(); } catch (_) { /* ignore */ }
      n.close();
    };
    setTimeout(() => n.close(), 8000);
  } catch (_) {
    /* ignore */
  }
}

/** All-in-one: play chime + show desktop notification for a new order. */
export function notifyNewOrder(order, onClick) {
  playUrgentChime();
  showDesktopNotif(
    `🔔 Pesanan baru #${order.order_number}`,
    `Meja ${order.table_number} · ${order.items.length} item · Rp ${Number(
      order.total || 0
    ).toLocaleString("id-ID")}`,
    onClick
  );
}

/** Staff alert: order is ready to be delivered. Loudest, hardest-to-miss chime. */
export function notifyReadyForDelivery(order, onClick) {
  playReadyChime();
  showDesktopNotif(
    `🛎️ Siap diantar — Meja ${order.table_number}`,
    `#${order.order_number} sudah siap. Antar sekarang!`,
    onClick
  );
}

/** Customer-side: friendly update for the customer's own order. */
export function notifyCustomerStatus(order) {
  const labels = {
    pembayaran_diterima: ["✓ Pembayaran diterima", "Pesananmu segera diproses."],
    diproses: ["⏳ Sedang diproses", "Dapur mulai menyiapkan pesananmu."],
    dimasak: ["🍳 Sedang dimasak", "Pesananmu sedang dimasak."],
    siap_diantar: ["🛎️ Siap diantar!", "Pesananmu sudah siap, akan segera diantar."],
    selesai: ["✓ Selesai", "Terima kasih telah memesan di SWM Cafe ☕"],
  };
  const [title, body] = labels[order.status] || [null, null];
  if (!title) return;
  playStatusChime(order.status);
  showDesktopNotif(title, `${body} #${order.order_number}`);
}
