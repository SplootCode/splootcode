import 'tslib'

export enum FrameState {
  DEAD = 0,
  LOADING,
  SW_INSTALLING,
  LIVE,
  UNMOUNTED,
}

let state = FrameState.LOADING

function sendHeartbeat() {
  sendToParent({ type: 'heartbeat', data: { state: state } })
}

function setState(newState: FrameState) {
  const isNew = state !== newState
  state = newState
  if (isNew) {
    sendHeartbeat()
  }
}

let serviceWorkerRegistration: ServiceWorkerRegistration
const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN

function sendToParent(payload) {
  parent.postMessage(payload, PARENT_TARGET_DOMAIN)
}

function sendToServiceWorker(payload) {
  serviceWorkerRegistration.active.postMessage(payload)
}

function handleMessageFromServiceWorker(event: MessageEvent) {
  const data = event.data
  switch (data.type) {
    case 'loaded':
      sendToParent(data)
      break
    default:
      console.warn('Unrecognised message recieved:', event.data)
  }
}

function handleMessage(event: MessageEvent) {
  const data = event.data
  if (data.type.startsWith('webpack')) {
    // Ignore webpack devserver
    return
  }
  switch (data.type) {
    case 'heartbeat':
      sendHeartbeat()
      break
    case 'nodetree':
      // Proxy to service worker directly.
      sendToServiceWorker(data)
      break
    default:
      console.warn('Unrecognised message recieved:', event.data)
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleMessageFromServiceWorker)
  window.addEventListener('load', function () {
    window.addEventListener('message', handleMessage, false)
    navigator.serviceWorker.register('/sw.js').then(
      function (registration: ServiceWorkerRegistration) {
        serviceWorkerRegistration = registration
        serviceWorkerRegistration.update()
        if (registration.installing) {
          setState(FrameState.SW_INSTALLING)
          registration.installing.addEventListener('statechange', (event) => {
            // @ts-ignore
            if (event.target.state === 'activated') {
              setState(FrameState.LIVE)
            }
          })
        } else if (registration.waiting) {
          setState(FrameState.LIVE)
        } else if (registration.active) {
          setState(FrameState.LIVE)
        }
      },
      function (err) {
        // registration failed :(
        console.warn('ServiceWorker registration failed: ', err)
      }
    )
  })
}
