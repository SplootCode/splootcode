import 'tslib'
import 'xterm/css/xterm.css'

import './terminal.css'

import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import React from 'react'
import ReactDOM from 'react-dom'

import WasmTTY from './wasm-tty/wasm-tty'
import { AppProviders } from './providers'
import { Button, ButtonGroup } from '@chakra-ui/react'

const PARENT_TARGET_DOMAIN = process.env.EDITOR_DOMAIN
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
  runtimeCapture: boolean
  autoRun: boolean
}

class Console extends React.Component<ConsoleProps, ConsoleState> {
  private termRef: React.RefObject<HTMLDivElement>
  private term: Terminal
  private terminalFitAddon: FitAddon
  private worker: Worker
  private stdinbuffer: SharedArrayBuffer
  private stdinbufferInt: Int32Array
  private _activeInput: boolean
  private wasmTty: WasmTTY
  private inputRecord: string[]

  constructor(props) {
    super(props)
    this.termRef = React.createRef()
    this.worker = null
    this._activeInput = false
    this.wasmTty = null
    this.inputRecord = []
    this.state = {
      ready: false,
      running: false,
      nodeTree: null,
      nodeTreeLoaded: false,
      runtimeCapture: true,
      autoRun: true,
    }
  }

  render() {
    const { ready, running, nodeTreeLoaded } = this.state
    return (
      <div id="terminal-container">
        <ButtonGroup spacing="3" size="sm" m={1}>
          <Button
            isLoading={running}
            loadingText="Running"
            colorScheme="teal"
            onClick={this.run}
            disabled={!(ready && nodeTreeLoaded && !running)}
          >
            Run
          </Button>
          <Button disabled={!running} onClick={this.stop}>
            Stop
          </Button>
        </ButtonGroup>
        <div id="terminal" ref={this.termRef} />
      </div>
    )
  }

  run = async () => {
    this.resolveActiveRead()
    this.term.clear()
    this.wasmTty.clearTty()
    this.stdinbuffer = new SharedArrayBuffer(100 * Int32Array.BYTES_PER_ELEMENT)
    this.stdinbufferInt = new Int32Array(this.stdinbuffer)
    this.stdinbufferInt[0] = -1
    this.inputRecord = []
    this.worker.postMessage({
      type: 'run',
      nodetree: this.state.nodeTree,
      buffer: this.stdinbuffer,
    })
    this.setState({ running: true })
  }

  rerun = async () => {
    this.resolveActiveRead()
    this.wasmTty.clearTty()
    this.term.clear()
    this.stdinbuffer = new SharedArrayBuffer(100 * Int32Array.BYTES_PER_ELEMENT)
    this.stdinbufferInt = new Int32Array(this.stdinbuffer)
    this.stdinbufferInt[0] = -1
    this.worker.postMessage({
      type: 'rerun',
      nodetree: this.state.nodeTree,
      buffer: this.stdinbuffer,
      readlines: this.inputRecord,
    })
    this.setState({ running: true })
  }

  stop = () => {
    this.resolveActiveRead()
    this.term.write('\r\nProgram Stopped.\r\n')
    this.worker.removeEventListener('message', this.handleMessageFromWorker)
    this.worker.terminate()
    this.worker = null
    this.setState({ running: false, ready: false })
    this.initialiseWorker()
  }

  handleMessageFromWorker = (event: MessageEvent) => {
    const type = event.data.type
    if (type === 'ready') {
      this.setState({ ready: true })
    } else if (type === 'stdout') {
      this.wasmTty.print(event.data.stdout)
    } else if (type === 'inputMode') {
      this.activateInputMode()
    } else if (type === 'inputValue') {
      this.recordInput(event.data.value)
    } else if (type === 'finished') {
      this.setState({ running: false })
    } else if (type === 'runtime_capture') {
      // Pass on capture info to the parent window.
      if (this.state.runtimeCapture) {
        sendToParent(event.data)
      }
    }
  }

  activateInputMode = () => {
    this._activeInput = true
    this.wasmTty.read()
  }

  recordInput = (s: string) => {
    this.inputRecord.push(s)
  }

  handleTermData = (data: string) => {
    // Only Allow CTRL+C Through when not inputting
    if (!this._activeInput && data !== '\x03') {
      // Ignore
      return
    }

    // If this looks like a pasted input, expand it
    if (data.length > 3 && data.charCodeAt(0) !== 0x1b) {
      const normData = data.replace(/[\r\n]+/g, '\r')
      Array.from(normData).forEach((c) => this.handleData(c))
    } else {
      this.handleData(data)
    }
  }

  /**
   * Handle input completion
   */
  handleReadComplete = async (): Promise<any> => {
    if (this._activeInput) {
      const input = this.wasmTty.getInput() + '\n'
      if (this.stdinbuffer && this.stdinbufferInt) {
        let startingIndex = 1
        if (this.stdinbufferInt[0] > 0) {
          startingIndex = this.stdinbufferInt[0]
        }
        const data = new TextEncoder().encode(input)
        data.forEach((value, index) => {
          this.stdinbufferInt[startingIndex + index] = value
        })

        this.stdinbufferInt[0] = startingIndex + data.length - 1
        Atomics.notify(this.stdinbufferInt, 0, 1)
      }
      this.term.write('\r\n')
      this._activeInput = false
    }
  }

  resolveActiveRead() {
    // Abort the read if we were reading
    if (this._activeInput) {
      this.term.write('\r\n')
    }
    this._activeInput = false
  }

  handleData = (data: string) => {
    // Only Allow CTRL+C Through
    if (!this._activeInput && data !== '\x03') {
      return
    }

    const ord = data.charCodeAt(0)
    // Handle ANSI escape sequences
    if (ord === 0x1b) {
      switch (data.substr(1)) {
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
        case '\x0d': // CTRL+M
          this.handleReadComplete()
          break

        case '\x7F': // BACKSPACE
        case '\x08': // CTRL+H
        case '\x04': // CTRL+D
          this.wasmTty.handleCursorErase(true)
          break

        case '\t': // TAB
          this.wasmTty.handleCursorInsert('    ')
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
          this.resolveActiveRead()
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
    this.term = new Terminal({ scrollback: 10000, fontSize: 14 })
    this.term.loadAddon(this.terminalFitAddon)
    this.wasmTty = new WasmTTY(this.term)
    this.term.open(this.termRef.current)
    this.terminalFitAddon.fit()
    this.term.onData(this.handleTermData)

    window.addEventListener('message', this.handleMessage, false)
    sendToParent({ type: 'heartbeat', data: { state: FrameState.LOADING } })

    window.addEventListener('resize', this.handleResize, false)
    this.initialiseWorker()
  }

  initialiseWorker = () => {
    if (!this.worker) {
      this.worker = new Worker(process.env.RUNTIME_PYTHON_WEBWORKER_PATH)
      this.worker.addEventListener('message', this.handleMessageFromWorker)
    }
  }

  handleResize = (event) => {
    if (this.terminalFitAddon) {
      this.terminalFitAddon.fit()
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
        })
        sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.state.autoRun && this.state.ready && !this.state.running) {
          this.rerun()
        }
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
