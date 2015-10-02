'use strict';


self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  var title = 'title: ServiceWorker say: you got a push message';
  var body = 'body: ServiceWorker say: you got a push message';
  var icon = 'https://wiki.mozilla.org/images/thumb/a/ad/Mdn_logo-wordmark-full_color.png/480px-Mdn_logo-wordmark-full_color.png';
  var tag = 'simple-push-demo-notification-tag';

  sendMsg('SW: says hi');

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      tag: tag
    })
  );
});

function sendMsg(msg){
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage(msg);
        // sendMsg(client, 'checkWindowActive: '+client.url);
        // sendMsg(client, 'checkWindowActive: '+ client.frameType + " | " + client.visibilityState);
      });
    });
}

self.addEventListener('onpushsubscriptionchange', function(event) {
  console.log('onpushsubscriptionchange: ' + event);
});

self.addEventListener('registration', function(event) {
  console.log('registration: ' + event);
});

self.addEventListener('activate', function(event) {
  console.log('activate: ' + event);
  sendMsg('activate');
});

self.addEventListener('install', function(event) {
  console.log('install event: ' + event);
});

self.addEventListener('message', function(event) {
  console.log('install event: ' + event.ports[0].postMessage("i recieved from page"));
});

// self.clients.matchAll().then(function(clients) {
//   clients.forEach(function(client) {
//     console.log('postMessage:'+client);
//     client.postMessage('SW: says hi');
//   });
// });

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ' + event.notification.tag);
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
      return clients.openWindow('/');
  }));

});

