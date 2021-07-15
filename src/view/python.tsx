import "tslib"

import React from "react"
import ReactDOM from "react-dom"

declare global {
  let pyodide;
  let loadPyodide;
}

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

class Stdout {
  appendOutput: (s: string) => void;

  constructor(appendFunc: (s: string) => void) {
    this.appendOutput = appendFunc;
  }

  write(s: string) {
    this.appendOutput(s);
  }

  flush() {
  }
}

interface ConsoleProps {

}

interface ConsoleState {
  output: string[];
  ready: boolean;
  nodeTree: any;
  nodeTreeLoaded: boolean;
}

class Console extends React.Component<ConsoleProps, ConsoleState> {

  constructor(props) {
    super(props);
    this.state = {
      output: [],
      ready: false,
      nodeTree: null,
      nodeTreeLoaded: false,
    };
  }

  render() {
    let {output, ready, nodeTreeLoaded} = this.state;
    return <div>
      <button onClick={this.run} disabled={!(ready && nodeTreeLoaded)}>Run</button>
      <pre>{output.join('')}</pre>
    </div>
  }

  run = async () => {
    let nodetree = this.state.nodeTree;
    this.setState({output: []});
    let code = await (await fetch('/static_frame/python/executor.py')).text()
    try {
      // await pyodide.pyodide_py.eval_code_async(code, pyodide.toPy({node_tree: nodetree}), undefined, 'none');
      await pyodide.pyodide_py.eval_code_async(code, undefined, undefined, 'none');
    } catch(err) {
      let output = this.state.output.slice()
      output.push(err);
      this.setState({output: output});
    }
  }

  componentDidMount() {
    sendToParent({type: 'heartbeat', data: {state: FrameState.LOADING}});
    // todo await this
    loadPyodide({ indexURL : 'https://cdn.jsdelivr.net/pyodide/v0.17.0/full/' }).then(() => {
      pyodide.registerJsModule('fakeprint', {
        stdout: new Stdout((s: string) => {
          let newOutput = this.state.output.slice();
          newOutput.push(s);
          this.setState({output: newOutput})
        }),
      });
      pyodide.registerJsModule('nodetree', {
        getNodeTree: () => {
          return pyodide.toPy(this.state.nodeTree);
        }
      });
      this.setState({ready: true});
    });
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
        console.log(data.data.tree);
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
