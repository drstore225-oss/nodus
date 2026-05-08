// Nodus Service Worker — Push Notifications + PWA cache

const CACHE_NAME = 'nodus-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── PUSH: recebe notificação do servidor (mesmo com app fechado) ───────────
self.addEventListener('push', (event) => {
  let data = { title: 'Nodus', body: 'Nova notificação', link: '/' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'nodus-notification',
      renotify: true,
      data: { link: data.link || '/' },
    })
  );
});

// ─── CLICK: ao clicar na notificação, abre/foca o app ──────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.link || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Tenta focar uma aba já aberta
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Caso contrário abre nova aba
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
