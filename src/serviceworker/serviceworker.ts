import * as recast from "recast";

import { HTML_DOCUMENT, SplootHtmlDocument } from "../language/types/html_document";
import { JavascriptFile, JAVASCRIPT_FILE } from "../language/types/javascript_file";
import { loadTypes } from "../language/type_loader";
import { deserializeNode, SerializedNode } from "../language/type_registry";

let parentWindowPort : MessagePort = null;
let cache = {};

loadTypes();

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

function handleNodeTree(filename: string, serializedNode: SerializedNode) {
  let rootNode = deserializeNode(serializedNode);
  if (rootNode === null) {
    console.warn('Failed to deserialize node tree.');
    return;
  }
  if (rootNode.type === HTML_DOCUMENT) {
    let htmlDocument = rootNode as SplootHtmlDocument;
    cache['/' + filename] = htmlDocument.generateHtml();
  } else if (rootNode.type === JAVASCRIPT_FILE) {
    let jsDoc = rootNode as JavascriptFile;
    cache['/' + filename] = recast.print(jsDoc.generateJsAst()).code;
  }
}

function handleParentWindowMessage(event: MessageEvent) {
  let data = event.data;
  switch (data.type) {
    case 'heartbeat':
      // Send heartbeat reply so the parent doesn't kill the frame.
      parentWindowPort.postMessage({type: 'heartbeat'});
      break;
    case 'nodetree':
      let {filename, tree} = data.data;
      handleNodeTree(filename, tree as SerializedNode)
      parentWindowPort.postMessage({type: 'ready'});
      break;
    default:
      console.log('Service worker. Unknow message from parent:', event);
  }
}

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