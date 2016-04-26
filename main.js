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
var ri_cb = "";
var repeat_txt = "";
var delay_txt = "";
var sw_txt = "";
var floodDelay_txt = "";

var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
var API_KEY = 'AIzaSyATs7ORhZVUA2vPTizpYgVf1cgjNos7ajg';
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

var WEBPUSH_SERVER = 'https://services-qa-webpush.stage.mozaws.net/notify';
if (document.URL.indexOf('localhost') > 0){
  WEBPUSH_SERVER = 'http://localhost:8001/notify';
}

//Utils
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
  checkFormVars();

  if(ri_cb === 'true'){
    notificationOptions.requireInteraction = true;
  }else if(ri_cb === 'false'){
    notificationOptions.requireInteraction = false;
  }
  notificationOptions.body = body_txt;
  notificationOptions.icon = icon_txt;
  notificationOptions.title = title_txt;
  if (tag_txt !== ""){
    notificationOptions.tag = tag_txt;
  }


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

  if(navigator.serviceWorker.controller){
      var elem = document.getElementById('reg_btn');
      var subscribe_btn = document.getElementById("subscribe_btn");
      elem.parentNode.removeChild(elem);
      subscribe_btn.parentNode.removeChild(subscribe_btn);
      document.getElementById("unreg_btn").style.visibility = "visible";
      // document.getElementById("subscribe_btn").style.visibility = "visible";
      registration = navigator.serviceWorker.controller;
      subscribe();
  }
}

function sendMsgToSW(action){
  checkFormVars();

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
  navigator.serviceWorker.getRegistration().then(function(r) {
    registration = r;
    registration.unregister().then(function(evt){
      writeLog('reg.unregister() returned: ' + evt);
      writeLog('note: registration isnt deleted till refresh so postMessage still works');
      window.location = '.';
    });

  });
}

function regSW() {
  writeLog('registering service worker');
  checkFormVars();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(sw_txt).then(function(reg) {
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

function writeSubscription(sub) {
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
    writeLog('curl -I -X POST --header "ttl: 60" "' + subscription.endpoint + '"');
    // document.getElementById("mailto_btn").style.visibility = "visible";
  }
  document.getElementById("xhr_msg").style.visibility = "visible";
}

function subscribe() {
  navigator.serviceWorker.ready.then(
    function(serviceWorkerRegistration) {
      // Do we already have a push message subscription?
      return serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true
      });
    })
    .then(writeSubscription)
    .catch(function(err) {
      writeLog('Error during subscribe: ' + err);
    });
}

function doXhr() {
  if (!endpoint || !registration) {
    writeLog('endpoint undefined');
    return;
  }
  sendMsgToSW();
  checkFormVars();
  msg_txt.value = msg_txt.value + '.';

  var post = new XMLHttpRequest();
  post.open('POST', WEBPUSH_SERVER);

  //Send the proper header information along with the request
  var obj = {"title" : 'SW:'+title_txt,
             "body" : 'SW:'+body_txt,
             "icon" : icon_txt,
             "targetUrl" : url_txt};

  if (tag_txt !== ""){
    obj["tag"] = tag_txt;
  }

  var params = "endpoint=" + encodeURIComponent(endpoint);
  params += "&TTL=" + ttl_txt;
  params += "&repeat=" + repeat_txt * 1;
  params += "&delay=" + delay_txt * 1000;
  params += "&floodDelay=" + floodDelay_txt * 1000;

  if (!(is_chrome)){
    params += "&payload="+ JSON.stringify(obj);
    params += "&userPublicKey=" + base64url.encode(subscription.getKey('p256dh'));
  }

  post.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  post.setRequestHeader("Content-length", params.length);
  post.setRequestHeader("Connection", "close");

  // var encrypted = webPush.encrypt(subscription.getKey('p256dh'), obj);
  // writeLog('encrypted.cipherText: _' + encrypted.cipherText + '_');
  // writeLog("echo '" + base64url.encode(encrypted.cipherText) + "' | base64 -D | curl -I -X POST '" +
  //          "--data-binary @- " + 
  //          "--header 'TTL: 60' " +
  //          "--header 'Content-Type: application/octet-stream' " +
  //          "--header 'Content-Encoding: aesgcm128' " +
  //          "--header 'Encryption-Key: keyid=p256dh;dh=" + base64url.encode(encrypted.localPublicKey) + "' " +
  //          "--header 'Encryption: keyid=p256dh;salt=" + base64url.encode(encrypted.salt) + "' " +
  //          "'" + subscription.endpoint + "'");

  post.onload = function(e) {
    writeLog("xhr onload: " + e.target.response);
    writeLog("status: " + post.status);
  };
  post.onerror = function(e) {
    writeLog("xhr onerror: " + e.target.response);
    writeLog("status: " + post.status);
  };

  writeLog("POST PARAMS:<br />" + params);
 
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
    // Was an issue with using controller vs active registration but i can't repro anymore
    // registration.active.postMessage(message, [messageChannel.port2]);
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// event handlers
window.onmessage = function(event) {
  writeLog("window.onmessage: " + event.data);
};

navigator.serviceWorker.onmessage = function(event) {
  if (typeof event.data == 'string') {
    writeLog("navigator.serviceWorker.onmessage: " + event.data);
    return;
  }
  if (event.data.type == 'pushsubscriptionchange') {
    writeLog('Got pushsubscriptionchange event from service worker');
    navigator.serviceWorker.getRegistration().then(function(r) {
      return r.pushManager.getSubscription();
    }).then(function(sub) {
      var endpoint = sub.endpoint;
      if (sub.endpoint != event.data.endpoint) {
        writeLog('Mismatched subscription endpoint');
      }
      if (!buffersAreEqual(event.data.publicKey, sub.getKey('p256dh'))) {
        writeLog('Mismatched subscription public key');
      }
      writeSubscription(sub);
    }).catch(function(error) {
      writeLog('Fetching subscription failed: ' + error);
    });
  }
};

// setup
function checkFormVars(){
  ri_cb = document.getElementById('ri_cb').value;

  target_txt = document.getElementById('target_txt').value;
  url_txt = document.getElementById('url_txt').value;

  title_txt = document.getElementById('msg_txt').value;
  body_txt = document.getElementById('body_txt').value;
  icon_txt = document.getElementById('icon_txt').value;
  tag_txt = document.getElementById('tag_txt').value;
  sw_txt = document.getElementById('sw_txt').value;
  url_txt = document.getElementById('url_txt').value;
  echo_txt = document.getElementById('echo_txt').value;
  ttl_txt = document.getElementById('ttl_txt').value;
  repeat_txt = document.getElementById('repeat_txt').value;
  delay_txt = document.getElementById('delay_txt').value;
  floodDelay_txt = document.getElementById('floodDelay_txt').value;
}


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
  checkSW();
}

function toByteArray(view) {
  var buffer = ArrayBuffer.isView(view) ? view.buffer : view;
  return new Uint8Array(buffer);
}

function buffersAreEqual(a, b) {
  a = toByteArray(a);
  b = toByteArray(b);
  if (a.length != b.length) {
    return false;
  }
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}
