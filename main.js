var notification;
var registration;
var subscription;
var endpoint;
var chrome_str;
var count = 0;
var title_txt = "";
var body_txt = "";
var icon_txt = "";
var url_txt = "";
var target_txt = "";
var echo_txt = "";

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
var API_KEY = 'AIzaSyATs7ORhZVUA2vPTizpYgVf1cgjNos7ajg';
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

var WEBPUSH_SERVER = 'https://services-qa-webpush.stage.mozaws.net/notify';
if (document.URL.indexOf('localhost') > 0){
  WEBPUSH_SERVER = 'http://localhost:8001/notify';
}

function writeLog(txt) {
  document.getElementById("demo").innerHTML += txt + '<br>';
  console.log(txt);
}

function chunkArray(array, size) {
  var start = array.byteOffset || 0;
  array = array.buffer || array;
  var index = 0;
  var result = [];
  while(index + size <= array.byteLength) {
    result.push(new Uint8Array(array, start + index, size));
    index += size;
  }
  if (index <= array.byteLength) {
    result.push(new Uint8Array(array, start + index));
  }
  return result;
}

var base64url = {
  _strmap: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  encode: function(data) {
    data = new Uint8Array(data);
    var len = Math.ceil(data.length * 4 / 3);
    return chunkArray(data, 3).map(chunk => [
      chunk[0] >>> 2,
      ((chunk[0] & 0x3) << 4) | (chunk[1] >>> 4),
      ((chunk[1] & 0xf) << 2) | (chunk[2] >>> 6),
      chunk[2] & 0x3f
    ].map(v => base64url._strmap[v]).join('')).join('').slice(0, len);
  },
  _lookup: function(s, i) {
    return base64url._strmap.indexOf(s.charAt(i));
  },
  decode: function(str) {
    var v = new Uint8Array(Math.floor(str.length * 3 / 4));
    var vi = 0;
    for (var si = 0; si < str.length;) {
      var w = base64url._lookup(str, si++);
      var x = base64url._lookup(str, si++);
      var y = base64url._lookup(str, si++);
      var z = base64url._lookup(str, si++);
      v[vi++] = w << 2 | x >>> 4;
      v[vi++] = x << 4 | y >>> 2;
      v[vi++] = y << 6 | z;
    }
    return v;
  }
};

 // Notification API

function popNotification() {
  var notificationOptions = {};
  // var ri_cb = document.getElementById('ri_cb').value;
  target_txt = document.getElementById('target_txt').value;
  url_txt = document.getElementById('url_txt').value;

  title_txt = document.getElementById('msg_txt').value;
  body_txt = document.getElementById('body_txt').value;
  icon_txt = document.getElementById('icon_txt').value;
  tag_txt = document.getElementById('tag_txt').value;

  // if(ri_cb === 'true'){
  //   notificationOptions.requireInteraction = true;
  // }else if(ri_cb === 'false'){
  //   notificationOptions.requireInteraction = false;
  // }
  notificationOptions.body = body_txt;
  notificationOptions.icon = icon_txt;
  notificationOptions.title = title_txt;
  notificationOptions.tag = tag_txt;


  writeLog('notificationOptions: '+ JSON.stringify(notificationOptions));
  notification = new Notification(title_txt, notificationOptions);
  notification.onclick = function(event) {
    event.preventDefault();
    writeLog('notification.onclick: window.open mozilla.org');
    window.open(url_txt, target_txt);
  };
  notification.onshow = function(event){
    writeLog('notification.onshow');
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
  // if (registration.active) {
  //   writeLog('Service worker active');
  // } else {
  //   writeLog('service worker NOT active');
  // }
}

function sendMsgToSW(action){
    url_txt = document.getElementById('url_txt').value;
    echo_txt = document.getElementById('echo_txt').value;

    sendMessage({
        command: action,
        text: echo_txt,
        url: url_txt})
    .then(function(data) {
        // If the promise resolves, just display a success message.
        writeLog('messageChannel.port1.onmessage: ' + data);
      }).catch(function(error) {
      // registration failed
      writeLog('Registration failed: ' + error);
    });
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
      // This only works if you refresh or if you set skipWaiting()
      // swc = navigator.serviceWorker.controller;
      // writeLog('navigator.serviceWorker.controller: ' + swc);
      // writeLog('getRegistration(): ' + swc.getRegistration());
      registration = reg;
      document.getElementById("unreg_btn").style.visibility = "visible";
      document.getElementById("subscribe_btn").style.visibility = "visible";
      writeLog('registered service worker. scope: ' + registration.scope);

      registration.onupdatefound = function(evt) {
        writeLog('onupdatefound: '+ evt);
      };
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
        .then(function(sub) {
          subscription = sub;
          endpoint = subscription.endpoint;
          writeLog('subscribed: ' + subscription);
          writeLog('endpoint:');
          document.getElementById("echo_txt").style.visibility = "visible";
          document.getElementById("sw_div").style.visibility = "visible";
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
            writeLog('curl -I -X POST --header "TTL: 60" "' + subscription.endpoint + '"');
            // document.getElementById("mailto_btn").style.visibility = "visible";
          }
          document.getElementById("xhr_msg").style.visibility = "visible";
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
  sendMsgToSW();
  title_txt = document.getElementById('msg_txt').value;
  body_txt = document.getElementById('body_txt').value;
  tag_txt = document.getElementById('tag_txt').value;
  ttl_txt = document.getElementById('ttl_txt').value;
  icon_txt = document.getElementById('icon_txt').value;
  url_txt = document.getElementById('url_txt').value;
  msg_txt.value = msg_txt.value + '.';
  var repeat_txt = document.getElementById('repeat_txt').value;
  var delay_txt = document.getElementById('delay_txt').value;

  var post = new XMLHttpRequest();
  post.open('POST', WEBPUSH_SERVER);

  //Send the proper header information along with the request
  var obj = {"title" : 'SW:'+title_txt,
              "body" : 'SW:'+body_txt,
              "tag" : tag_txt,
              "icon" : icon_txt,
              "targetUrl" : url_txt};

  var params = "endpoint=" + encodeURIComponent(endpoint);
  params += "&TTL=" + ttl_txt;
  params += "&repeat=" + repeat_txt * 1;
  params += "&delay=" + delay_txt * 1000;

  if (!(is_chrome)){
    params += "&payload="+ JSON.stringify(obj);
    params += "&userPublicKey=" + base64url.encode(subscription.getKey('p256dh'));
  }

  post.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  post.setRequestHeader("Content-length", params.length);
  post.setRequestHeader("Connection", "close");


  post.onload = function(e) {
    writeLog("xhr got data " + e.target.response);
  };
  post.onerror = function(e) {
    // writeLog("received: " + e);
    writeLog("status: " + post.status);
  };

  writeLog("Sending endpoint..." + params);

  post.send(params);

}

function sendMail() {
  window.location = "mailto:MYUSER@mozilla.com?subject=CURL_ME&body=" + chrome_str;
}


function sendMessage(message) {
  // This wraps the message posting/response in a promise, which will resolve if the response doesn't
  // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
  // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
  // a convenient wrapper.
  console.log('sendMessage'+message);
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
    registration.active.postMessage(message, [messageChannel.port2]);
    // navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
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
