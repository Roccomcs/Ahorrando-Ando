self.addEventListener('push', function (event) {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: 'Ahorrando Ando', body: event.data.text() } }

  const title = payload.title ?? 'Ahorrando Ando'
  const options = {
    body: payload.body ?? '',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: payload.tag ?? 'aa-alert',
    data: { url: payload.url ?? '/alerts' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url ?? '/alerts'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()))
