import React from 'react'
import { Component } from 'react'
import { SplootNode } from '../../language/node';
import { globalMutationDispatcher } from '../../language/mutations/mutation_dispatcher';
import { NodeMutation } from '../../language/mutations/node_mutations';
import { ChildSetMutation } from '../../language/mutations/child_set_mutations';

import './frame_view.css';

export enum FrameState {
  DEAD = 0,
  AWAITING_SW_PORT,
  CONNECTING_TO_SW,
  CONNECTED,
  UNMOUNTED,
}

interface DocumentNodeProps {
    rootNode?: SplootNode
}

const subdomain = "projection"; // TODO: Make dynamic
const FRAME_VIEW_DOMAIN = process.env.FRAME_VIEW_DOMAIN;
const FRAME_VIEW_SCHEME = process.env.FRAME_VIEW_SCHEME;

function getFrameSrc() {
  let rand = Math.floor((Math.random() * 1000000) + 1);
  return getFrameDomain() + '/splootframeclient.html' + '?a=' + rand;
}

function getFrameDomain() {
  if (FRAME_VIEW_DOMAIN.startsWith('localhost')) {
    return FRAME_VIEW_SCHEME + '://' + FRAME_VIEW_DOMAIN;
  }
  return FRAME_VIEW_SCHEME + '://' + subdomain + '.' + FRAME_VIEW_DOMAIN;
}


class DocumentNodeComponent extends Component<DocumentNodeProps> {
  private frameRef: React.RefObject<HTMLIFrameElement>;
  private frameState: FrameState;
  private lastHeartbeatTimestamp: Date;
  private lastSentNodeTree: Date;
  private needsNewNodeTree: boolean;
  private serviceWorkerPort: MessagePort;

  constructor(props: DocumentNodeProps) {
    super(props);
    this.frameRef = React.createRef();
    this.frameState = FrameState.AWAITING_SW_PORT;
    this.lastHeartbeatTimestamp = new Date();
    this.lastSentNodeTree = new Date();
    this.needsNewNodeTree = false;
  }

  render() {
      return (
        <iframe ref={this.frameRef}
          id="view-frame"
          src={getFrameSrc()}
        />
      );
  }

  sendRequestForServiceWorkerPort() {
    let payload = {type: 'requestserviceworkerport' };
    this.postMessageToFrame(payload);
  }

  sendNodeTreeToServiceWorker() {
    let now = new Date();
    let millis = (now.getTime() - this.lastSentNodeTree.getTime());
    // Only send if it's been some time since we last sent.
    if (millis > 0) {
      console.log('Sending node tree');
      let tree = this.props.rootNode.serialize();
      let payload = {type: 'nodetree', data: tree};
      this.postMessageToServiceWorker(payload);
      this.needsNewNodeTree = false;
      this.lastSentNodeTree = now;
      return;
    }
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true;
  }

  postMessageToFrame = (payload: object) => {
    try {
      this.frameRef.current.contentWindow.postMessage(payload, getFrameDomain());
    }
    catch (error) {
      console.warn(error);
    }
  }

  postMessageToServiceWorker(payload: object) {
    try {
      this.serviceWorkerPort.postMessage(payload);
    }
    catch (error) {
      console.warn(error);
    }
  }

  sendHeartbeatRequest() {
    let payload = {type: 'heartbeat' };
    this.postMessageToServiceWorker(payload);
  }

  checkHeartbeatFromFrame = () => {
    if (this.frameState === FrameState.UNMOUNTED) {
      return;
    }
    let now = new Date();
    let millis = (now.getTime() - this.lastHeartbeatTimestamp.getTime());
    if (millis > 60000) {
      this.frameState = FrameState.DEAD;
    }
    switch (this.frameState) {
      case FrameState.AWAITING_SW_PORT:
        this.sendRequestForServiceWorkerPort();
        break;
      case FrameState.CONNECTING_TO_SW:
        this.sendHeartbeatRequest();
        break;
      case FrameState.CONNECTED:
        break;
      case FrameState.DEAD:
        console.warn('frame is dead, reloading');
        this.frameRef.current.src = getFrameSrc();
        this.frameState = FrameState.AWAITING_SW_PORT;
        this.lastHeartbeatTimestamp = new Date();
        break;
    }

    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 20000); // 20s
  }

  handleNodeMutation = (mutation: NodeMutation) => {
    this.sendNodeTreeToServiceWorker();
  }

  handleChildSetMutation = (mutation: ChildSetMutation) => {
    this.sendNodeTreeToServiceWorker();
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === getFrameDomain()) {
      this.handleMessageFromFrame(event);
    }
  }

  handleMessageFromServiceWorker = (event: MessageEvent) => {
    let data = event.data;
    switch (data.type) {
      case 'heartbeat':
        this.frameState = FrameState.CONNECTED;
        // Load the index.html from the service worker.
        console.log('connected');
        break;
      case 'ready':
        this.frameState = FrameState.CONNECTED;
        this.frameRef.current.src = getFrameDomain() + '/index.html';
        break;
      default:
        console.log('Parent. Unkown message from service worker:', event);
    }
  }

  handleMessageFromFrame(event: MessageEvent) {
    let type = event.data.type as string;
    if (!event.data.type) {
      return;
    }
    if (type.startsWith('webpack')) {
      // Ignore webpack devserver events for local dev
      return;
    }
    switch(type) {
      case 'serviceworkerport':
        this.serviceWorkerPort = event.ports[0];
        this.serviceWorkerPort.addEventListener('message', this.handleMessageFromServiceWorker);
        this.serviceWorkerPort.start();
        this.frameState = FrameState.CONNECTING_TO_SW;
        this.sendNodeTreeToServiceWorker();
        this.lastHeartbeatTimestamp = new Date();
        break;
      default:
        console.warn('Unknown event from frame: ', event);
    }
  }

  componentDidMount() {
    this.frameState = FrameState.AWAITING_SW_PORT;
    globalMutationDispatcher.registerChildSetObserver(this);
    window.addEventListener("message", this.processMessage, false);
    // trigger background process to wait for a response
    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 0);
  }

  componentWillUnmount() {
    this.frameState = FrameState.UNMOUNTED;
    // mutationDispatcher.deregisterHandler(this.handleMutation);
    window.removeEventListener("message", this.processMessage, false);
  }
}

type ViewPageProps = {
  rootNode: SplootNode,
}

type ViewPageState = {
    hasError: boolean;
    error: any;
    errorInfo: any;
}

export class ViewPage extends Component<ViewPageProps, ViewPageState> {
    constructor(props : ViewPageProps) {
      super(props);
      this.state = {
          hasError: false,
          error: '',
          errorInfo: '',
      };
    }

    componentDidCatch(error, info) {
      this.setState({
        hasError: true,
        error: error,
        errorInfo: info,
      } );
    }

    resetErrors = (event) => {
        this.setState({hasError: false});
    }

    render() {
        let { rootNode } = this.props;
        if (this.state.hasError) {
            return (
                <div>
                    <h2>Error!</h2>
                    <p>{this.state.error.toString()}</p>
                    <button onClick={this.resetErrors}>Try again</button>
                </div>
            );
        }
        return (
            <div>
                <DocumentNodeComponent rootNode={rootNode}/>
            </div>
        );
    }
}
  