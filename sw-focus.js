'use strict';

var port;
var count = 1;

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
var title = 'SW: Title Text, Title Text, Title Text, Title Text, Title Text, Title Text, Title Text, Title Text, Title Text, Title Text';
var body = 'SW: Body Text (Chrome doesn\'t support data in 44) Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum';
var icon = 'icon.png';
var targetUrl = 'https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/onnotificationclick';

self.addEventListener('push', function(event) {
  console.log('Received a push message::', event);

  if (event.data) {
    var obj = event.data.json();
    title = obj.title;
    body = obj.body;
    icon = obj.icon;
    targetUrl = obj.targetUrl;
  }

  event.waitUntil(clients.matchAll().then(function(clientList) {
    popNotification();
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      console.log('client.url' + client.url);
      client.postMessage("Push Event Count: " + count);
      count++;
    }
  }));

});
var windowExists = false;
function popNotification() {
  self.registration.showNotification(title, {
    body: body,
    icon: icon
  });

  self.addEventListener('notificationclick', function(event) {
    console.log('On notification click: ', event.notification);

    event.waitUntil(
      clients.matchAll({
        type: "window"
      })
      .then(function(clientList) {
        console.log('clientList.length: ' + clientList.length);
        if (clientList.length > 0){
          console.log('clientList[0].focus()');
          clientList[0].focus();
        }else{
          console.log("clients.openWindow()");
          return clients.openWindow("https://people.mozilla.org/~ewong2/push-notification-test/");
        }
        // for (var i = 0; i < clientList.length; i++) {
        //   var client = clientList[i];
        //   console.log('client.url: ' + client.url);
        //   if (client.url == "https://people.mozilla.org/~ewong2/push-notification-test/") {
        //     windowExists = true;
        //     return client.focus();
        //   }
        // }
        // if (!windowExists) {
        //   clients.openWindow(targetUrl);
        // }
      })
    );
  });
}

self.addEventListener('message', function(event) {
  console.log('Handling message event:', event);
  port = event.ports[0];
  // event.ports[0] corresponds to the MessagePort that was transferred as part of the controlled page's
  // call to controller.postMessage(). Therefore, event.ports[0].postMessage() will trigger the onmessage
  // handler from the controlled page.
  // It's up to you how to structure the messages that you send back; this is just one example.
  port.postMessage('SW echo: ' + event.data.text);
  if (event.data.command == 'pop') {
    targetUrl = event.data.url;
    popNotification();
  }

});

self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('pushsubscriptionchange: ', event);
});

self.addEventListener('registration', function(event) {
  console.log('registration: ', event);
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
  console.log('activate: ', event);
});

self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
  console.log('install event: ', event);
});