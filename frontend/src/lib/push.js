import api from "@/lib/api";

const SW_PATH = "/service-worker.js";
const KEY_ENABLED = "swm_push_enabled";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const pushEnabled = () => localStorage.getItem(KEY_ENABLED) === "on";

/** Register the service worker (idempotent). Returns the registration. */
export async function registerServiceWorker() {
  if (!pushSupported()) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!reg) reg = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    return null;
  }
}

/** Subscribe current device for push and POST to backend. role: "staff" | "customer". */
export async function subscribePush({ role = "staff", orderId = null } = {}) {
  if (!pushSupported()) return { ok: false, error: "Browser tidak mendukung Web Push" };
  if (Notification.permission === "denied") {
    return { ok: false, error: "Izin notifikasi diblokir" };
  }
  if (Notification.permission === "default") {
    const res = await Notification.requestPermission();
    if (res !== "granted") return { ok: false, error: "Izin notifikasi ditolak" };
  }
  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: "Service Worker gagal terdaftar" };

  // Fetch VAPID public key from backend
  let publicKey;
  try {
    const { data } = await api.get("/push/vapid-public-key");
    publicKey = data.public_key;
  } catch (e) {
    return { ok: false, error: "Gagal ambil VAPID public key" };
  }
  if (!publicKey) return { ok: false, error: "VAPID public key kosong" };

  // Get or create subscription
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch (e) {
      return { ok: false, error: `Gagal subscribe: ${e.message || e}` };
    }
  }

  const subJson = sub.toJSON();
  try {
    await api.post("/push/subscribe", {
      endpoint: subJson.endpoint,
      keys: subJson.keys,
      role,
      order_id: orderId,
    });
  } catch (e) {
    return { ok: false, error: "Gagal kirim subscription ke server" };
  }

  localStorage.setItem(KEY_ENABLED, "on");
  return { ok: true };
}

export async function unsubscribePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const subJson = sub.toJSON();
    try {
      await api.post("/push/unsubscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      });
    } catch (_) {
      /* ignore */
    }
    try {
      await sub.unsubscribe();
    } catch (_) {
      /* ignore */
    }
  }
  localStorage.setItem(KEY_ENABLED, "off");
}

export async function sendTestPush() {
  try {
    await api.post("/push/test");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.response?.data?.detail || "Gagal kirim test push" };
  }
}
