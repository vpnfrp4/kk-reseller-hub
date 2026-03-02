/* ─── Push Notification Handlers for Service Worker ─── */

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = {
      title: "KKREMOTER",
      body: event.data ? event.data.text() : "New notification",
    };
  }

  const options = {
    body: data.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.tag || "kkremoter-" + Date.now(),
    data: { link: data.link || "/dashboard" },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "KKREMOTER", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var link = (event.notification.data && event.notification.data.link) || "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Try to focus an existing window
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if (
            new URL(client.url).origin === self.location.origin &&
            "focus" in client
          ) {
            client.navigate(link);
            return client.focus();
          }
        }
        // No existing window — open a new one
        return clients.openWindow(link);
      })
  );
});
