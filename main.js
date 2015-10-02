var notification;
var registration;
var endpoint;
var chrome_str;
var count = 0;

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
var API_KEY = 'AIzaSyATs7ORhZVUA2vPTizpYgVf1cgjNos7ajg';
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

function writeLog(txt) {
  document.getElementById("demo").innerHTML += txt + '<br>';
}

 // Notification API

function popNotification() {
  notification = new Notification(msg_txt.value);
  notification.onclick = function() {
    writeLog('notification.onclick: window.open mozilla.org');
    window.open('http://www.mozilla.org', target_txt.value);
  };
  msg_txt.value = msg_txt.value + '.';
}

function notifyMe() {
  // Let's check if the browser supports notifications
  writeLog('Notification.permission: ' + Notification.permission);
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    popNotification();
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied' || Notification.permission === "default") {
    writeLog('requesting Notification Permission');
    Notification.requestPermission(function(permission) {
      // If the user accepts, let's create a notification
      writeLog('Notification.permission: ' + Notification.permission);
      if (permission === "granted") {
        popNotification();
      }
    });
  }
}

function closeNotification() {
  notification.close();
}

 // Service Worker API
function checkSW() {
  writeLog('checking service worker');
  if (typeof registration === 'undefined') {
    writeLog('service worker registration is undefined');
    return;
  }
  if (registration.installing) {
    writeLog('Service worker installing');
  } else if (registration.waiting) {
    writeLog('Service worker is waiting');
  }
  if (registration.active) {
    writeLog('Service worker active');
  } else {
    writeLog('service worker NOT active');
  }
}

function unregSW() {
  registration.unregister().then(function(boolean) {
    writeLog('reg.unregister() returned: ' + boolean);
  });
}

function regSW() {
  writeLog('registering service worker');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(sw_txt.value).then(function(reg) {
      registration = reg;
      document.getElementById("unreg_btn").style.visibility = "visible";
      document.getElementById("subscribe_btn").style.visibility = "visible";
      writeLog('registered service worker. scope: ' + registration.scope);
    }).catch(function(error) {
      // registration failed
      writeLog('Registration failed: ' + error);
    });
  }
}

function subscribe() {
  navigator.serviceWorker.ready.then(
    function(serviceWorkerRegistration) {
      // Do we already have a push message subscription?  
      serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true
        })
        .then(function(subscription) {
          endpoint = subscription.endpoint;
          writeLog('subscribed: ' + subscription);
          writeLog('endpoint:');

          sendMessage('Page says Hi');

          if (is_chrome) {
            var endpointSections = endpoint.split('/');
            var subscriptionId = endpointSections[endpointSections.length - 1];
            chrome_str = 'curl --header "Authorization: key=' + API_KEY + '"';
            chrome_str += ' --header "TTL: 60" --header Content-Type:"application/json" https://android.googleapis.com/gcm/send -d "{\\"registration_ids\\":[\\"';
            chrome_str += subscriptionId;
            chrome_str += '\\"]}"';
            writeLog(chrome_str);
            document.getElementById("mailto_btn").style.visibility = "visible";
          } else {
            writeLog('<p>curl -I -X POST --header "TTL: 60" ' + subscription.endpoint + '</p>');
            document.getElementById("doXhr_btn").style.visibility = "visible";
          }

        })
        .catch(function(err) {
          writeLog('Error during subscribe: ' + err);
        });
    });
}

function doXhr() {
  if (!endpoint || !registration) {
    writeLog('endpoint undefined');
    return;
  }
  // Registration is a PUT call to the remote server.
  var post = new XMLHttpRequest();
  post.open('POST', endpoint);
  // post.setRequestHeader("Content-Type",
  //         "application/x-www-form-urlencoded");
  post.onload = function(e) {
    writeLog("xhr got data: " + e.target.response);
  };
  post.onerror = function(e) {
    // writeLog("received: " + e);
    writeLog("status: " + post.status);
  };

  writeLog("Sending endpoint..." + endpoint);
  post.send("push=" + encodeURIComponent(endpoint));
}

function sendMail() {
  window.location = "mailto:MYUSER@mozilla.com?subject=CURL_ME&body=" + chrome_str;
}

// postMessage

// function sendMessage(message) {
//   writeLog('page::sendMessage() called:' + message);
//   navigator.serviceWorker.ready.then(function(reg) {
//     try {
//       reg.active.postMessage({
//         text: message
//       }, [messageChannel && messageChannel.port2]);
//     } catch (e) {
//       // getting a cloning error in Firefox
//       reg.active.postMessage({
//         text: message
//       });
//     }
//   });

// }

function sendMessage(message) {
  // This wraps the message posting/response in a promise, which will resolve if the response doesn't
  // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
  // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
  // a convenient wrapper.
  return new Promise(function(resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function(event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    // This sends the message data as well as transferring messageChannel.port2 to the service worker.
    // The service worker can then use the transferred port to reply via postMessage(), which
    // will in turn trigger the onmessage handler on messageChannel.port1.
    // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// event handlers

window.onmessage = function(event) {
  writeLog("window.onmessage: " + event.data);
};

navigator.serviceWorker.onmessage = function(event) {
  writeLog("navigator.serviceWorker.onmessage: " + event.data);
};

// setup

function checkEnv() {
  console.log('checkEnv');
  if (!('serviceWorker' in navigator)) {
    writeLog('Your Browser doesn\'t support ServiceWorkers');
  }
  if (!(window.PushManager)) {
    writeLog("Your Browser doesn't support Push");
  }
  if (document.URL.indexOf('https') === -1 && document.URL.indexOf('localhost') === -1) {
    window.location = document.URL.replace("http://", "https://");
    writeLog("You need to be on https or localhost");
  }

}
