import "tslib"
import "xterm/css/xterm.css"

import { Terminal } from 'xterm';

import React from "react"
import ReactDOM from "react-dom"

const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN;
export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED
}

function sendToParent(payload) {
  parent.postMessage(payload, PARENT_TARGET_DOMAIN);
}


interface ConsoleProps {
}

interface ConsoleState {
  ready: boolean;
  nodeTree: any;
  nodeTreeLoaded: boolean;
}

class Console extends React.Component<ConsoleProps, ConsoleState> {
  private termRef : React.RefObject<HTMLDivElement>;
  private term : Terminal;
  private worker : Worker;
  private stdinbuffer : SharedArrayBuffer;
  private stdinbufferInt : Int32Array;

  constructor(props) {
    super(props);
    this.termRef = React.createRef();
    this.worker = null;
    this.state = {
      ready: false,
      nodeTree: null,
      nodeTreeLoaded: false,
    };
  }

  render() {
    let {ready, nodeTreeLoaded} = this.state;
    return <div>
      <button onClick={this.run} disabled={!(ready && nodeTreeLoaded)}>Run</button>
      <div ref={this.termRef}/>
    </div>
  }

  run = async () => {
    this.term.clear();
    this.stdinbuffer = new SharedArrayBuffer(100 * Int32Array.BYTES_PER_ELEMENT);
    this.stdinbufferInt = new Int32Array(this.stdinbuffer);
    this.stdinbufferInt[0] = -1;
    this.worker.postMessage({
      type: 'run',
      nodetree: this.state.nodeTree,
      buffer: this.stdinbuffer,
    })
  }

  handleMessageFromWorker = (event : MessageEvent) => {
    let type = event.data.type;
    if (type === 'ready') {
      this.setState({'ready': true});
    } else if (type === 'stdout') {
      this.term.write(event.data.stdout.replace('\n', '\r\n'));
    }
  }

  onTerminalKey = (arg: {key: string, domEvent: KeyboardEvent}) => {
    if (this.stdinbuffer && this.stdinbufferInt) {
      this.term.write(arg.key.replace('\r', '\r\n'));
      let startingIndex = 1;
      if (this.stdinbufferInt[0] > 0) {
        startingIndex = this.stdinbufferInt[0];
      }
      const data = new TextEncoder().encode(arg.key);
      data.forEach((value, index) => {
        this.stdinbufferInt[startingIndex + index] = value;
      });

      this.stdinbufferInt[0] = startingIndex + data.length - 1;
      Atomics.notify(this.stdinbufferInt, 0, 1);
    }
  }

  componentDidMount() {
    this.term = new Terminal();
    this.term.open(this.termRef.current);
    this.term.onKey(this.onTerminalKey)

    sendToParent({type: 'heartbeat', data: {state: FrameState.LOADING}});

    this.worker = new Worker('/static_frame/webworker.js');
    this.worker.onmessage = this.handleMessageFromWorker;
    window.addEventListener("message", this.handleMessage, false);
  }

  componentWillUnmount() {
    window.removeEventListener("message", this.handleMessage, false);
  }

  handleMessage = (event: MessageEvent) => {
    let data = event.data;
    if (data.type && data.type.startsWith('webpack')) {
      // Ignore webpack devserver
      return;
    }
  
    switch (data.type) {
      case 'heartbeat':
        if (this.state.nodeTreeLoaded) {
          sendToParent({type: 'heartbeat', data: {state: FrameState.LIVE}});
        } else {
          sendToParent({type: 'heartbeat', data: {state: FrameState.LOADING}});
        }
        break;
      case 'nodetree':
        this.setState({
          nodeTree: data.data.tree,
          nodeTreeLoaded: true,
        })
        sendToParent({type: 'heartbeat', data: {state: FrameState.LIVE}});
        break;
      default:
        console.warn('Unrecognised message recieved:', event.data);
    }
  }
}

const root = document.getElementById('app-root')

ReactDOM.render(<Console/>, root);
