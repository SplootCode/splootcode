import 'tslib'
import runtime from 'serviceworker-webpack-plugin/lib/runtime';

export enum FrameState {
  DEAD = 0,
  LOADING,
  LOADED,
}

const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN;

function sendServiceWorkerPort(serviceWorkerRegistration: ServiceWorkerRegistration) {
  const messageChannel = new MessageChannel();
  parent.postMessage({'type': 'serviceworkerport'}, PARENT_TARGET_DOMAIN, [messageChannel.port1]);
  serviceWorkerRegistration.active.postMessage({'type': 'parentwindowport'}, [messageChannel.port2]);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    runtime.register().then(function(registration: ServiceWorkerRegistration) {
      // Registration was successful
      sendServiceWorkerPort(registration);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}