'use strict';

self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  var title = 'title: ServiceWorker say: you got a push message';
  var body = 'body: ServiceWorker say: you got a push message';
  var icon = 'http://en.gravatar.com/userimage/46923021/fde5f27848c4ce416f32103597ca7216.jpeg';
  var tag = 'simple-push-demo-notification-tag';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      tag: tag
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification.tag);
  // Android doesn’t close the notification when you click on it
  // See: http://crbug.com/463146
  event.notification.close();

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      console.log('client.url', client.url);
      if (client.url == '/' && 'focus' in client)
        return client.focus();
    }
    if (clients.openWindow)
      // window.open('http://www.mozilla.org', '_blank');
      return clients.openWindow('/');
  }));

});