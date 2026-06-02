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

/** Play a loud 3-note bell chime (≈0.7s total). */
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
