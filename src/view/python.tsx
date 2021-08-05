import "tslib"
import "xterm/css/xterm.css"

import { Terminal } from 'xterm';

import React from "react"
import ReactDOM from "react-dom"

import WasmTTY  from "./wasm-tty/wasm-tty";

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
  private _activeInput : boolean;
  private wasmTty : WasmTTY;

  constructor(props) {
    super(props);
    this.termRef = React.createRef();
    this.worker = null;
    this._activeInput = false;
    this.wasmTty = null;
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
      this.wasmTty.print(event.data.stdout)
    } else if (type === 'inputMode') {
      this.activateInputMode();
    }
  }

  activateInputMode = () => {
    this._activeInput = true;
    this.wasmTty.read();
  }

  handleTermData = (data: string) => {
    // Only Allow CTRL+C Through when not inputting
    if (!this._activeInput && data !== "\x03") {
      // Ignore
      return;
    }

    // If this looks like a pasted input, expand it
    if (data.length > 3 && data.charCodeAt(0) !== 0x1b) {
      const normData = data.replace(/[\r\n]+/g, "\r");
      Array.from(normData).forEach((c) => this.handleData(c));
    } else {
      this.handleData(data);
    }
  };

  /**
   * Handle input completion
   */
  handleReadComplete = async (): Promise<any> => {
    if (this._activeInput) {
      let input = this.wasmTty.getInput() + '\n';
      if (this.stdinbuffer && this.stdinbufferInt) {
        let startingIndex = 1;
        if (this.stdinbufferInt[0] > 0) {
          startingIndex = this.stdinbufferInt[0];
        }
        const data = new TextEncoder().encode(input);
        data.forEach((value, index) => {
          this.stdinbufferInt[startingIndex + index] = value;
        });

        this.stdinbufferInt[0] = startingIndex + data.length - 1;
        Atomics.notify(this.stdinbufferInt, 0, 1);
      }
      this.term.write('\r\n');
      this._activeInput = false;
    }
  };

  resolveActiveRead() {
    // Abort the read if we were reading
    this._activeInput = false;
  }

  handleData = (data: string) => {
    // Only Allow CTRL+C Through
    if (!this._activeInput && data !== "\x03") {
      return;
    }

    const ord = data.charCodeAt(0);
    // Handle ANSI escape sequences
    if (ord === 0x1b) {
      switch (data.substr(1)) {
        case "[A": // Up arrow
          break;

        case "[B": // Down arrow
          break;

        case "[D": // Left Arrow
          this.wasmTty.handleCursorMove(-1);
          break;

        case "[C": // Right Arrow
          this.wasmTty.handleCursorMove(1);
          break;

        case "[3~": // Delete
          this.wasmTty.handleCursorErase(false);
          break;

        case "[F": // End
          this.wasmTty.moveCursorToEnd()
          break;

        case "[H": // Home
          this.wasmTty.moveCursorToStart();
          break;

        // Not supported
        case "b": // ALT + LEFT
        case "f": // ALT + RIGHT
        case "\x7F": // CTRL + BACKSPACE
          break;
      }

    // Handle special characters
    } else if (ord < 32 || ord === 0x7f) {
      switch (data) {
        case "\r": // ENTER
        case "\x0a": // CTRL+J
        case "\x0d": // CTRL+M
          this.handleReadComplete();
          break;

        case "\x7F": // BACKSPACE
        case "\x08": // CTRL+H
        case "\x04": // CTRL+D
          this.wasmTty.handleCursorErase(true);
          break;

        case "\t": // TAB
          this.wasmTty.handleCursorInsert("    ");
          break;

        case "\x01": // CTRL+A
          this.wasmTty.moveCursorToStart();
          break;

        case "\x02": // CTRL+B
          this.wasmTty.handleCursorMove(-1);
          break;

        case "\x03": // CTRL+C
        case "\x1a": // CTRL+Z

          // TODO: Handle CTRL-C

          // If we are prompting, then we want to cancel the current read
          this.resolveActiveRead();
          break;

        case "\x05": // CTRL+E
          this.wasmTty.moveCursorToEnd();
          break;

        case "\x06": // CTRL+F
          this.wasmTty.handleCursorMove(1);
          break;

        case "\x07": // CTRL+G
          break;

        case "\x0b": // CTRL+K
          this.wasmTty.cutInputRight();
          break;

        case "\x0c": // CTRL+L
          // TODO: handle this sensibly?
          break;

        case "\x0e": // CTRL+N
          break;

        case "\x10": // CTRL+P
          break;

        case "\x15": // CTRL+U
          this.wasmTty.cutInputLeft()
          break;
      }

      // Handle visible characters
    } else {
      this.wasmTty.handleCursorInsert(data);
    }
  };

  componentDidMount() {
    this.term = new Terminal();
    this.wasmTty = new WasmTTY(this.term);
    this.term.open(this.termRef.current);
    this.term.onData(this.handleTermData)

    window.addEventListener("message", this.handleMessage, false);
    sendToParent({type: 'heartbeat', data: {state: FrameState.LOADING}});

    this.worker = new Worker('/static_frame/webworker.js');
    this.worker.onmessage = this.handleMessageFromWorker;
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
