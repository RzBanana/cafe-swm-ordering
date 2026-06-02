/* SWM Cafe — Service Worker for Web Push notifications.
 *
 * Lifecycle:
 *   install → skipWaiting to take control immediately
 *   activate → clients.claim
 *   push    → parse JSON payload, show notification (title+body+url)
 *   notificationclick → focus existing tab or open url
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "SWM Cafe", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "SWM Cafe";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || "swm-notif",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Focus an existing tab if one is on the same origin
      for (const client of list) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) {
            try {
              client.navigate(targetUrl);
            } catch (_) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
