import { observer } from "mobx-react"
import React, { Component } from "react"
import { StatementCapture } from "@splootcode/core/language/capture/runtime_capture"

import { ChildSetMutation } from "@splootcode/core/language/mutations/child_set_mutations"
import { globalMutationDispatcher } from "@splootcode/core/language/mutations/mutation_dispatcher"
import { NodeMutation } from "@splootcode/core/language/mutations/node_mutations"
import { SplootPackage } from "@splootcode/core/language/projects/package"

import "./python_frame.css";

export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED
}

const FRAME_VIEW_DOMAIN = process.env.FRAME_VIEW_DOMAIN;
const FRAME_VIEW_SCHEME = process.env.FRAME_VIEW_SCHEME;

function getFrameDomain() {
  return FRAME_VIEW_SCHEME + '://' + FRAME_VIEW_DOMAIN;
}

function getFrameSrc() {
  let rand = Math.floor((Math.random() * 1000000) + 1);
  return getFrameDomain() + '/splootframepythonclient.html' + '?a=' + rand;
}

type ViewPageProps = {
  pkg: SplootPackage,
}

@observer
export class PythonFrame extends Component<ViewPageProps> {
  private frameRef: React.RefObject<HTMLIFrameElement>;
  private lastHeartbeatTimestamp: Date;
  private lastSentNodeTree: Date;
  private needsNewNodeTree: boolean;
  private frameState: FrameState;

  constructor(props: ViewPageProps) {
    super(props);
    this.frameRef = React.createRef();
    this.frameState = FrameState.LOADING;
    this.lastHeartbeatTimestamp = new Date();
    this.lastSentNodeTree = new Date(new Date().getMilliseconds() - 1000);
    this.needsNewNodeTree = false;
  }

  render() {
    this.needsNewNodeTree = true;
    return (
      <div id="python-frame-container">
        <iframe ref={this.frameRef}
          id="view-python-frame"
          src={getFrameSrc()}
          width={480}
          height={700}
          allow="cross-origin-isolated"
        />
      </div>
    );
  }

  postMessageToFrame(payload: object) {
    try {
      this.frameRef.current.contentWindow.postMessage(payload, getFrameDomain());
    }
    catch (error) {
      console.warn(error);
    }
  }

  checkHeartbeatFromFrame = () => {
    if (this.frameState === FrameState.UNMOUNTED) {
      return;
    }
    let now = new Date();
    let millis = (now.getTime() - this.lastHeartbeatTimestamp.getTime());
    if (millis > 30000) {
      this.frameState = FrameState.DEAD;
    }
    switch (this.frameState) {
      case FrameState.LOADING:
        this.sendNodeTreeToHiddenFrame();
        break;
      case FrameState.LIVE:
        if (this.needsNewNodeTree) {
          this.sendNodeTreeToHiddenFrame();
        } else {
          this.sendHeartbeatRequest();
        }
        break;
      case FrameState.DEAD:
        console.warn('frame is dead, reloading');
        this.frameRef.current.src = getFrameSrc();
        this.frameState = FrameState.LOADING;
        this.lastHeartbeatTimestamp = new Date();
        break;
    }
    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 2000); // 2s
  }

  handleNodeMutation = (mutation: NodeMutation) => {
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true;
    this.sendNodeTreeToHiddenFrame();
  }

  handleChildSetMutation = (mutation: ChildSetMutation) => {
    // There's a node tree version we've not loaded yet.
    this.needsNewNodeTree = true;
    this.sendNodeTreeToHiddenFrame();
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === getFrameDomain()) {
      this.handleMessageFromFrame(event);
    }
  }

  handleMessageFromFrame(event: MessageEvent) {
    let type = event.data.type as string;
    if (event.origin !== getFrameDomain()) {
      return;
    }
    if (!event.data.type) {
      return;
    }
    if (type.startsWith('webpack')) {
      // Ignore webpack devserver events for local dev
      return;
    }
    switch(type) {
      case 'heartbeat':
        this.frameState = event.data.data['state'];
        this.lastHeartbeatTimestamp = new Date();
        break;
      case 'loaded':
        this.lastHeartbeatTimestamp = new Date();
        break;
      case 'runtime_capture':
        let capture = JSON.parse(event.data.capture) as StatementCapture;
        this.updateRuntimeCapture(capture);
        break;
      default:
        console.warn('Unknown event from frame: ', event);
    }
  }

  updateRuntimeCapture(capture : StatementCapture) {
    // TODO: handle mutliple python files or different names.
    const filename = 'main.py'
    this.props.pkg.getLoadedFile(filename).then(file => {
      file.rootNode.recursivelyApplyRuntimeCapture(capture);
    }).catch(err => {
      console.warn(err);
      console.warn(`Failed to apply runtime capture`)
    });
  }
  
  sendHeartbeatRequest() {
    let payload = {type: 'heartbeat'};
    this.postMessageToFrame(payload);
  }

  sendNodeTreeToHiddenFrame() {
    let now = new Date();
    let millis = (now.getTime() - this.lastSentNodeTree.getTime());
    let pkg = this.props.pkg;

    // Rate limit: Only send if it's been some time since we last sent.
    if (millis > 200) {
      this.lastSentNodeTree = now;
      this.needsNewNodeTree = false;
      pkg.fileOrder.forEach(filename => {
        pkg.getLoadedFile(filename).then((file) => {
          let payload = {type: 'nodetree', data: {filename: file.name, tree: file.rootNode.serialize()}};
          this.postMessageToFrame(payload);
          return;
        })
      })
    }
  }

  componentDidMount() {
    this.frameState = FrameState.LOADING;
    globalMutationDispatcher.registerChildSetObserver(this);
    globalMutationDispatcher.registerNodeObserver(this);
    window.addEventListener("message", this.processMessage, false);
    // trigger background process to wait for a response
    setTimeout(() => {
      this.checkHeartbeatFromFrame();
    }, 0);
  }

  componentWillUnmount() {
    this.frameState = FrameState.UNMOUNTED;
    window.removeEventListener("message", this.processMessage, false);

    globalMutationDispatcher.deregisterChildSetObserver(this);
    globalMutationDispatcher.deregisterNodeObserver(this);
    // mutationDispatcher.deregisterHandler(this.handleMutation);
  }

}