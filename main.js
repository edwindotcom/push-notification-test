function notifyMe() {
  // Let's check if the browser supports notifications
  writeLog('Notification.permission: '+ Notification.permission);
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted"  ) {
    // If it's okay let's create a notification
    var notification = new Notification(msg_txt.value);
    checkNotifyProperites(Notification);

    notification.onclick = function(){notify();};
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied' || Notification.permission === "default") {
    Notification.requestPermission(function (permission) {
      // If the user accepts, let's create a notification
      writeLog('request Notification Permission');
      if (permission === "granted") {
        var notification = new Notification("Hi there!");
        checkNotifyProperites(Notification);
        notification.onclick = function(){notify();};
      }
    });
}

function checkNotifyProperites(p){
  writeLog(':::dump props:::');
  for (var key in p) {
    if (p.hasOwnProperty(key)) {
      writeLog(key + ":" + p[key]);
    }
  }
}

}
function notify(){
  writeLog('notification.onclick: window.open mozilla.org');
  window.open('http://www.mozilla.org', '_blank');
}

function regSW(){
  writeLog('regSW');
  navigator.serviceWorker.register('service-worker.js');
}

function subscribe(){
  navigator.serviceWorker.ready.then(
      function(serviceWorkerRegistration) {
  // Do we already have a push message subscription?  
      serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function(subscription) {
          writeLog('subscribed: '+subscription);
          writeLog('endpoint:');
          writeLog('curl -I -X POST ' + subscription.endpoint);
      })
      .catch(function(err) {
          writeLog('Error during subscribe: '+err);
      });
  });
}


function writeLog(txt){
  document.getElementById("demo").innerHTML += txt + '<br>';
}