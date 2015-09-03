var notification;

function notifyMe() {
  // Let's check if the browser supports notifications
  writeLog('Notification.permission: '+ Notification.permission);
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted"  ) {
    // If it's okay let's create a notification
    notification = new Notification(msg_txt.value);
    // checkNotifyProperites(Notification);
    notification.onclick = function(){notify();};
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied' || Notification.permission === "default") {
    writeLog('requesting Notification Permission');
    Notification.requestPermission(function (permission) {
      // If the user accepts, let's create a notification
      writeLog('Notification.permission: '+ Notification.permission);
      if (permission === "granted") {
        notification = new Notification("Hi there!");
        // checkNotifyProperites(Notification);
        notification.onclick = function(){notify();};
      }
    });
  }
}

function closeNotification(){
  notification.close();
}

function notify(){
  writeLog('notification.onclick: window.open mozilla.org');
  window.open('http://www.mozilla.org', '_blank');
}
var registration;

function checkSW(){
  if(!registration){
    writeLog('service worker not active');
    return;
  }
  if(registration.installing) {
    writeLog('Service worker installing');
  } else if(registration.waiting) {
    writeLog('Service worker installed');
  } else if(registration.active) {
    writeLog('Service worker active');
  }
}

function unregSW(){
  registration.unregister().then(function(boolean) {
    writeLog('unregister returned: '+ boolean);
  });
}
function regSW(){
  writeLog('regSW');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').then(function(reg) {
        registration = reg;
        checkSW(reg);
      }).catch(function(error) {
        // registration failed
        console.log('Registration failed with ' + error);
      });
    }
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