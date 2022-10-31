import './terminal.css'
import 'tslib'
import 'xterm/css/xterm.css'

import React from 'react'
import ReactDOM from 'react-dom'
import WasmTTY from './wasm-tty/wasm-tty'
import { AppProviders } from './providers'
import { Button, ButtonGroup } from '@chakra-ui/react'
import { FitAddon } from 'xterm-addon-fit'
import { Terminal } from 'xterm'
import { WorkerManager, WorkerState } from './worker-manager'

// @ts-ignore
import WorkerURL from './webworker?worker&url'

const PARENT_TARGET_DOMAIN = import.meta.env.SPLOOT_EDITOR_DOMAIN
export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED,
}

function sendToParent(payload) {
  parent.postMessage(payload, PARENT_TARGET_DOMAIN)
}

interface ConsoleProps {}

interface ConsoleState {
  ready: boolean
  running: boolean
  nodeTree: any
  nodeTreeLoaded: boolean
  nodeTreeErrors: boolean
  runtimeCapture: boolean
  autoRun: boolean
}

class Console extends React.Component<ConsoleProps, ConsoleState> {
  private termRef: React.RefObject<HTMLDivElement>
  private term: Terminal
  private terminalFitAddon: FitAddon
  private workerManager: WorkerManager
  private resolveActiveInput?: (s: string) => void
  private rejectActiveInput?: () => void
  private wasmTty: WasmTTY
  private pasteLinesBuffer: string[]

  constructor(props) {
    super(props)
    this.termRef = React.createRef()
    this.resolveActiveInput = null
    this.rejectActiveInput = null
    this.wasmTty = null
    this.pasteLinesBuffer = []

    this.state = {
      ready: false,
      running: false,
      nodeTree: null,
      nodeTreeLoaded: false,
      nodeTreeErrors: false,
      runtimeCapture: true,
      autoRun: true,
    }
  }

  render() {
    const { ready, running, nodeTreeLoaded, nodeTreeErrors } = this.state
    return (
      <div id="terminal-container">
        <div className="terminal-menu">
          <ButtonGroup size="md" m={1} height={8}>
            <Button
              isLoading={running}
              loadingText="Running"
              colorScheme="blue"
              onClick={this.run}
              disabled={!(ready && nodeTreeLoaded && !nodeTreeErrors && !running)}
              height={8}
            >
              Run
            </Button>
            <Button disabled={!running} onClick={this.stop} height={8}>
              Stop
            </Button>
          </ButtonGroup>
        </div>
        <div id="terminal" ref={this.termRef} />
      </div>
    )
  }

  run = async () => {
    this.term.clear()
    this.wasmTty.clearTty()
    this.setState({ running: true })
    this.workerManager.run(this.state.nodeTree)
  }

  rerun = async () => {
    this.wasmTty.clearTty()
    this.term.clear()
    this.setState({ running: true })
    this.workerManager.rerun(this.state.nodeTree)
  }

  stop = () => {
    if (this.rejectActiveInput) {
      this.rejectActiveInput()
    } else {
      this.workerManager.stop()
    }
  }

  handleTermData = (data: string) => {
    // Only Allow CTRL+C Through when not inputting
    if (!this.resolveActiveInput && data !== '\x03') {
      // Ignore
      return
    }

    // If this looks like a pasted input, expand it
    if (data.length > 3 && data.charCodeAt(0) !== 0x1b) {
      const normData = data.replace(/(\r\n)/g, '\r').replace(/(\n)/g, '\r')
      if (normData.includes('\r')) {
        const lines = normData.split('\r')
        this.pasteLinesBuffer = lines.slice(1)
        Array.from(lines[0]).forEach((c) => this.handleData(c))
        this.handleData('\r')
      } else {
        Array.from(data).forEach((c) => this.handleData(c))
      }
    } else {
      this.handleData(data)
    }
  }

  handleData = (data: string) => {
    // Only Allow CTRL+C Through
    if (!this.resolveActiveInput && data !== '\x03') {
      return
    }

    const ord = data.charCodeAt(0)
    // Handle ANSI escape sequences
    if (ord === 0x1b) {
      switch (data.substring(1)) {
        case '[A': // Up arrow
          break

        case '[B': // Down arrow
          break

        case '[D': // Left Arrow
          this.wasmTty.handleCursorMove(-1)
          break

        case '[C': // Right Arrow
          this.wasmTty.handleCursorMove(1)
          break

        case '[3~': // Delete
          this.wasmTty.handleCursorErase(false)
          break

        case '[F': // End
          this.wasmTty.moveCursorToEnd()
          break

        case '[H': // Home
          this.wasmTty.moveCursorToStart()
          break

        // Not supported
        case 'b': // ALT + LEFT
        case 'f': // ALT + RIGHT
        case '\x7F': // CTRL + BACKSPACE
          break
      }

      // Handle special characters
    } else if (ord < 32 || ord === 0x7f) {
      switch (data) {
        case '\r': // ENTER
        case '\x0a': // CTRL+J
          this.resolveActiveInput(this.wasmTty.getInput())
          break

        case '\x7F': // BACKSPACE
        case '\x08': // CTRL+H
        case '\x04': // CTRL+D
          this.wasmTty.handleCursorErase(true)
          break

        case '\t': // TAB
          this.wasmTty.handleCursorInsert('\t')
          break

        case '\x01': // CTRL+A
          this.wasmTty.moveCursorToStart()
          break

        case '\x02': // CTRL+B
          this.wasmTty.handleCursorMove(-1)
          break

        case '\x03': // CTRL+C
        case '\x1a': // CTRL+Z
          // TODO: Handle CTRL-C

          // If we are prompting, then we want to cancel the current read
          if (this.rejectActiveInput) {
            this.rejectActiveInput()
          } else {
            this.stop()
          }
          break

        case '\x05': // CTRL+E
          this.wasmTty.moveCursorToEnd()
          break

        case '\x06': // CTRL+F
          this.wasmTty.handleCursorMove(1)
          break

        case '\x07': // CTRL+G
          break

        case '\x0b': // CTRL+K
          this.wasmTty.cutInputRight()
          break

        case '\x0c': // CTRL+L
          // TODO: handle this sensibly?
          break

        case '\x0e': // CTRL+N
          break

        case '\x10': // CTRL+P
          break

        case '\x15': // CTRL+U
          this.wasmTty.cutInputLeft()
          break
      }

      // Handle visible characters
    } else {
      this.wasmTty.handleCursorInsert(data)
    }
  }

  componentDidMount() {
    this.terminalFitAddon = new FitAddon()
    this.term = new Terminal({ scrollback: 10000, fontSize: 14, theme: { background: '#040810' } })
    this.term.loadAddon(this.terminalFitAddon)
    this.wasmTty = new WasmTTY(this.term)
    this.term.open(this.termRef.current)
    this.terminalFitAddon.fit()
    this.term.onData(this.handleTermData)

    window.addEventListener('message', this.handleMessage, false)
    sendToParent({ type: 'heartbeat', data: { state: FrameState.LOADING } })

    window.addEventListener('resize', this.handleResize, false)
    this.initialiseWorkerManager()
  }

  getTerminalInput: () => Promise<string> = async () => {
    await this.wasmTty.read()
    const inputPromise: Promise<string> = new Promise((resolve, reject) => {
      this.resolveActiveInput = (s: string) => {
        this.term.write('\r\n')
        resolve(s + '\n')
        this.resolveActiveInput = null
        this.rejectActiveInput = null
      }
      this.rejectActiveInput = () => {
        reject()
        this.resolveActiveInput = null
        this.rejectActiveInput = null
      }
    })

    if (this.pasteLinesBuffer.length !== 0) {
      const line = this.pasteLinesBuffer.shift()
      Array.from(line).forEach((c) => this.handleData(c))
      if (this.pasteLinesBuffer.length !== 0) {
        this.handleData('\r')
      }
    }

    return inputPromise
  }

  initialiseWorkerManager = () => {
    this.workerManager = new WorkerManager(
      WorkerURL,
      {
        stdin: this.getTerminalInput,
        stdout: (s: string) => {
          this.wasmTty.print(s)
        },
        stderr: (s: string) => {
          this.wasmTty.print(s)
        },
      },
      (state: WorkerState) => {
        if (state === WorkerState.READY) {
          this.setState({ ready: true, running: false })
          this.pasteLinesBuffer = []
          sendToParent({ type: 'ready' })
        } else if (state === WorkerState.DISABLED) {
          this.setState({ ready: false, running: false })
        }
      }
    )
  }

  handleResize = (event) => {
    if (this.terminalFitAddon) {
      this.terminalFitAddon.fit()
      this.wasmTty.reflowInput()
    }
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage, false)
  }

  handleMessage = (event: MessageEvent) => {
    const data = event.data
    if (data.type && data.type.startsWith('webpack')) {
      // Ignore webpack devserver
      return
    }

    switch (data.type) {
      case 'heartbeat':
        if (this.state.nodeTreeLoaded) {
          sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        } else {
          sendToParent({ type: 'heartbeat', data: { state: FrameState.LOADING } })
        }
        break
      case 'nodetree':
        this.setState({
          nodeTree: data.data.tree,
          nodeTreeLoaded: true,
          nodeTreeErrors: false,
        })
        sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.state.autoRun && this.state.ready && !this.state.running) {
          this.rerun()
        }
        break
      case 'disable':
        this.setState({ nodeTreeErrors: true })
        break
      case 'module_info':
        this.workerManager.loadModule(data.moduleName)
        break
      default:
        console.warn('Unrecognised message recieved:', event.data)
    }
  }
}

const root = document.getElementById('app-root')

ReactDOM.render(
  <AppProviders>
    <Console />
  </AppProviders>,
  root
)
