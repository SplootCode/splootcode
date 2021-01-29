import { SplootHtmlDocument } from "../language/types/html_document";
import { loadTypes } from "../language/type_loader";
import { deserializeNode, SerializedNode } from "../language/type_registry";

let parentPort : MessagePort = null;

let cache = {};

self.addEventListener('install', function(event) {
  loadTypes();
  return Promise.resolve('loaded');
});

async function resolveModuleNameFromCache(pathname: string) {
  let contents = cache[pathname];
  let headers = {'Content-Type': 'text/html;charset=UTF-8'}
  let response = new Response(contents, {status: 200, statusText: 'ok', headers: headers});
  return response;
}

self.addEventListener('fetch', (event : FetchEvent) => {
  console.log('This is a fetch', event.request.url);
  console.log('cache:', cache);
  let url = new URL(event.request.url);
  console.log(url.pathname);
  if (url.pathname in cache) {
    event.respondWith(resolveModuleNameFromCache(url.pathname));
  }
});

function handleNodeTree(rootNode: SerializedNode) {
  console.log(rootNode.type);
  let htmlDocument = deserializeNode(rootNode) as SplootHtmlDocument;
  cache['/index.html'] = htmlDocument.generateHtml();
}

function handleParentWindowMessage(event: MessageEvent) {
  let data = event.data;
  switch (data.type) {
    case 'heartbeat':
      // Send heartbeat reply so the parent doesn't kill the frame.
      parentPort.postMessage({type: 'heartbeat'});
      break;
    case 'nodetree':
      console.log('recieved node tree');
      handleNodeTree(data.data as SerializedNode)
      parentPort.postMessage({type: 'ready'});
      break;
    default:
      console.log('Service worker. Unknow message from parent:', event);
  }
}

self.addEventListener('message', event => {
  let data = event.data;
  if (event.origin == self.location.origin) {
    if (data.type === 'parentwindowport') {
      loadTypes();
      parentPort = event.ports[0];
      parentPort.addEventListener('message', handleParentWindowMessage)
      parentPort.start();
    }
  } else {
    console.warn('Service worker recieved event from unknown origin:', event)
  }
});