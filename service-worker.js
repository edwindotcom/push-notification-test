'use strict';

var port;
var count = 1;

function dumpObj(object){
  console.log(':dumpObj:');
  for (var property in object) {
    console.log('::'+ property + ":" + object[property]);
    if (object.hasOwnProperty(property)) {
        console.log('::' + property + ":" + object[property]);
    }
  }
}

self.addEventListener('push', function(event) {
  console.log('Received a push message::', event);
  var obj = event.data.json();
  // var obj = event.data.json();
  // console.log('onpush:');
  // dumpObj(data);
  // console.log('onpush: '+ obj);
  var title = obj.title;
  var body = obj.body;
  var icon = obj.icon;
  var tag = 'simple-push-demo-notification-tag';

  event.waitUntil(clients.matchAll().then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      client.postMessage("Push Event Count: " + count);
      count++;
    }
  }));

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      tag: tag
    })
  );
});

self.addEventListener('message', function(event) {
  console.log('Handling message event:', event);
  port = event.ports[0];
  // event.ports[0] corresponds to the MessagePort that was transferred as part of the controlled page's
  // call to controller.postMessage(). Therefore, event.ports[0].postMessage() will trigger the onmessage
  // handler from the controlled page.
  // It's up to you how to structure the messages that you send back; this is just one example.
  port.postMessage('SW echo: ' + event.data.command);
});

self.addEventListener('onpushsubscriptionchange', function(event) {
  console.log('onpushsubscriptionchange: ', event);
});

self.addEventListener('registration', function(event) {
  console.log('registration: ', event);
  change();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
  console.log('activate: ', event);
  change();
});

self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
  console.log('install event: ', event);
  change();
});


function change(){
  console.log('self.clients: ', self.clients);
  console.log('self.caches: ', self.caches);
}

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
      return clients.openWindow('/');
  }));
});

self.addEventListener('install', function(event) {
  console.log('install event: ', event);
});
