import 'tslib'
import { SplootHtmlDocument } from '../language/types/html_document';
import { loadTypes } from '../language/type_loader';
import { deserializeNode as deserializeNode, SerializedNode } from '../language/type_registry';
import { loadCommandlineApp, recieveCode } from './commandline';
import { DomManager } from './dom_manager';

// On startup, load the node types.
loadTypes();

export enum FrameState {
  DEAD = 0,
  LOADING,
  LOADED,
}

const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN;
const domManager = new DomManager();
let selfFrameState = FrameState.LOADING;

function sendFrameStateHeartbeat() {
  let payload = { 'type': 'heartbeat', 'state': selfFrameState };
  parent.postMessage(payload, PARENT_TARGET_DOMAIN);
}

function processMessage(event: MessageEvent) {
  if (!event.data.type) {
    return;
  }
  let type = event.data.type as string;
  if (type.startsWith('webpack')) {
    // Ignore webpack devserver events for local dev
    return;
  }

  switch(type) {
    case 'htmlnodetree':
      console.log('New htmlnodetree recieved, loading.');
      let rootNode = event.data.data as SerializedNode;

      let splootNode = deserializeNode(rootNode) as SplootHtmlDocument;

      domManager.loadNodeTree(splootNode);
      setTimeout(() => {
        dispatchEvent(new Event('load'));
      }, 2000); // Hack - replace with something better
      selfFrameState = FrameState.LOADED;
      sendFrameStateHeartbeat();
      break;
    case 'commandlineapp':
      console.log('New commandlineapp recieved, loading');
      let code = event.data.data;
      setTimeout(recieveCode, 10, code);
      selfFrameState = FrameState.LOADED;
      sendFrameStateHeartbeat();
      break;
    case 'mutation':
      domManager.applyMutation(event.data.data);
      break;
    case 'heartbeat':
      sendFrameStateHeartbeat();
      break;
    default:
      console.warn('Unknown event: ')
      console.log(event.data);
  }
}

window.onload = () => {
  loadCommandlineApp();
  window.addEventListener("message", processMessage, false);
  sendFrameStateHeartbeat();
}