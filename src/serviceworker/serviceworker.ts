import { SplootHtmlDocument } from "../language/types/html_document";
import { loadTypes } from "../language/type_loader";
import { deserializeNode, SerializedNode } from "../language/type_registry";

let parentWindowPort : MessagePort = null;
let cache = {};

self.addEventListener('install', function(event) {
  return Promise.resolve('loaded');
});

async function resoleFileFromCache(pathname: string) {
  let contents = cache[pathname];
  let headers = {'Content-Type': 'text/html;charset=UTF-8'}
  let response = new Response(contents, {status: 200, statusText: 'ok', headers: headers});
  return response;
}

self.addEventListener('fetch', (event : FetchEvent) => {
  let url = new URL(event.request.url);
  if (url.pathname in cache) {
    event.respondWith(resoleFileFromCache(url.pathname));
  }
});

function handleNodeTree(rootNode: SerializedNode) {
  let htmlDocument = deserializeNode(rootNode) as SplootHtmlDocument;
  cache['/index.html'] = htmlDocument.generateHtml();
}

function handleParentWindowMessage(event: MessageEvent) {
  let data = event.data;
  switch (data.type) {
    case 'heartbeat':
      // Send heartbeat reply so the parent doesn't kill the frame.
      parentWindowPort.postMessage({type: 'heartbeat'});
      break;
    case 'nodetree':
      handleNodeTree(data.data as SerializedNode)
      parentWindowPort.postMessage({type: 'ready'});
      break;
    default:
      console.log('Service worker. Unknow message from parent:', event);
  }
}

self.addEventListener('activate', (event) => {
  loadTypes();
});

self.addEventListener('message', event => {
  let data = event.data;
  if (event.origin == self.location.origin) {
    if (data.type === 'parentwindowport') {
      parentWindowPort = event.ports[0];
      parentWindowPort.addEventListener('message', handleParentWindowMessage)
      parentWindowPort.start();
    }
  } else {
    console.warn('Service worker recieved event from unknown origin:', event)
  }
});