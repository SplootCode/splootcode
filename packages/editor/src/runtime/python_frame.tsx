import './python_frame.css'
import './terminal.css'
import 'tslib'
import 'xterm/css/xterm.css'
import React, { Component } from 'react'
import WasmTTY from './wasm-tty/wasm-tty'
import { Button, ButtonGroup } from '@chakra-ui/react'
import { CapturePayload } from '@splootcode/core'
import { FileChangeWatcher, FileSpec } from './file_change_watcher'
import { FitAddon } from 'xterm-addon-fit'
import { FrameStateManager } from './frame_state_manager'
import { Terminal } from 'xterm'

type ViewPageProps = {
  fileChangeWatcher: FileChangeWatcher
  frameScheme: 'http' | 'https'
  frameDomain: string
}

interface ConsoleState {
  ready: boolean
  running: boolean
  runtimeCapture: boolean
  frameSrc: string
}

export class PythonFrame extends Component<ViewPageProps, ConsoleState> {
  private frameRef: React.RefObject<HTMLIFrameElement>
  private frameStateManager: FrameStateManager
  private termRef: React.RefObject<HTMLDivElement>
  private term: Terminal
  private terminalFitAddon: FitAddon
  private resolveActiveInput?: (s: string) => void
  private wasmTty: WasmTTY
  private pasteLinesBuffer: string[]
  private resizeObserver: ResizeObserver

  constructor(props: ViewPageProps) {
    super(props)
    this.frameRef = React.createRef()
    this.frameStateManager = new FrameStateManager(
      this.postMessageToFrame,
      this.reloadFrame,
      this.sendNodeTreeToHiddenFrame
    )
    this.termRef = React.createRef()
    this.resolveActiveInput = null
    this.wasmTty = null
    this.pasteLinesBuffer = []
    this.resizeObserver = new ResizeObserver((entries) => {
      this.handleResize()
    })

    this.state = {
      ready: false,
      running: false,
      runtimeCapture: true,
      frameSrc: this.getFrameSrc(),
    }
  }

  render() {
    const { ready, running } = this.state
    return (
      <div id="python-frame-container">
        <div id="terminal-container">
          <div className="terminal-menu">
            <ButtonGroup size="md" m={1} height={8}>
              <Button
                isLoading={running}
                loadingText="Running"
                colorScheme="blue"
                onClick={this.run}
                disabled={!(ready && !running)}
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
        <iframe
          ref={this.frameRef}
          id="view-python-frame"
          src={this.state.frameSrc}
          width={480}
          height={700}
          allow="cross-origin-isolated"
        />
      </div>
    )
  }

  run = async () => {
    this.term.clear()
    this.wasmTty.clearTty()
    this.postMessageToFrame({ type: 'run' })
    this.setState({ running: true })
  }

  rerun = async () => {
    this.wasmTty.clearTty()
    this.term.clear()
    this.postMessageToFrame({ type: 'rerun' })
    this.setState({ running: true })
  }

  stop = () => {
    if (this.resolveActiveInput) {
      this.resolveActiveInput('')
    }
    this.postMessageToFrame({ type: 'stop' })
    this.setState({ running: false, ready: false })
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
          if (this.resolveActiveInput) {
            this.resolveActiveInput('')
          }
          this.stop()
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

  getFrameDomain = () => {
    return this.props.frameScheme + '://' + this.props.frameDomain
  }

  getFrameSrc = () => {
    const rand = Math.floor(Math.random() * 1000000 + 1)
    return this.getFrameDomain() + '/splootframepythonclient.html' + '?a=' + rand
  }

  postMessageToFrame = (payload: object) => {
    try {
      this.frameRef.current.contentWindow.postMessage(payload, this.getFrameDomain())
    } catch (error) {
      console.warn(error)
    }
  }

  processMessage = (event: MessageEvent) => {
    if (event.origin === this.getFrameDomain()) {
      this.handleMessageFromFrame(event)
    }
  }

  handleMessageFromFrame(event: MessageEvent) {
    const type = event.data.type as string
    if (event.origin !== this.getFrameDomain()) {
      return
    }
    if (!event.data.type) {
      return
    }
    if (type.startsWith('webpack')) {
      // Ignore webpack devserver events for local dev
      return
    }
    switch (type) {
      case 'heartbeat':
        this.frameStateManager.handleHeartbeat(event.data.data)
        break
      case 'ready':
        this.setState({ ready: true, running: false })
        this.props.fileChangeWatcher.onPythonRuntimeIsReady()
        break
      case 'running':
        this.term.clear()
        this.wasmTty.clearTty()
        this.setState({ running: true })
        break
      case 'disabled':
        this.setState({ ready: false, running: false })
        break
      case 'stdin':
        this.getTerminalInput().then((input) => {
          this.postMessageToFrame({
            type: 'stdin',
            stdin: input,
          })
        })
        break
      case 'stdout':
        this.wasmTty.print(event.data.stdout)
        break
      case 'stderr':
        this.wasmTty.print(event.data.stderr)
        break
      case 'runtime_capture':
        const captures = event.data.captures as Map<string, CapturePayload>
        this.props.fileChangeWatcher.updateRuntimeCaptures(captures)
        break
      case 'module_info':
        this.props.fileChangeWatcher.recievedModuleInfo(event.data.info)
        break
      default:
        console.warn('Unknown event from frame: ', event)
    }
  }

  loadModule = (moduleName: string) => {
    this.postMessageToFrame({
      type: 'module_info',
      moduleName: moduleName,
    })
  }

  sendNodeTreeToHiddenFrame = async (isInitial: boolean) => {
    let isValid = this.props.fileChangeWatcher.isValid()
    if (!isValid) {
      this.setState({ ready: false })
      this.frameStateManager.setNeedsNewNodeTree(false)
      return
    }
    let fileState: Map<string, FileSpec>
    if (isInitial) {
      fileState = await this.props.fileChangeWatcher.getAllFileState()
    } else {
      fileState = await this.props.fileChangeWatcher.getUpdatedFileState()
    }

    // Check validity again - if it's not valid, bail out
    isValid = this.props.fileChangeWatcher.isValid()
    if (!isValid) {
      this.setState({ ready: false })
      this.frameStateManager.setNeedsNewNodeTree(false)
      return
    }

    const messageType = isInitial ? 'initialfiles' : 'updatedfiles'
    const payload = { type: messageType, data: { files: fileState } }
    this.postMessageToFrame(payload)
    this.frameStateManager.setNeedsNewNodeTree(false)
  }

  reloadFrame = () => {
    this.frameRef.current.src = this.getFrameSrc()
  }

  getTerminalInput: () => Promise<string> = async () => {
    await this.wasmTty.read()
    const inputPromise: Promise<string> = new Promise((resolve) => {
      this.resolveActiveInput = (s: string) => {
        this.term.write('\r\n')
        resolve(s + '\n')
        this.resolveActiveInput = null
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

  handleResize = () => {
    if (this.terminalFitAddon) {
      this.terminalFitAddon.fit()
      this.wasmTty.reflowInput()
    }
  }

  setDirty = () => {
    this.frameStateManager.setNeedsNewNodeTree(true)
  }

  componentDidMount() {
    this.term = new Terminal({ scrollback: 10000, fontSize: 14, theme: { background: '#040810' } })
    this.wasmTty = new WasmTTY(this.term)
    this.terminalFitAddon = new FitAddon()
    this.term.loadAddon(this.terminalFitAddon)
    this.term.open(this.termRef.current)
    this.term.onData(this.handleTermData)
    setTimeout(() => {
      this.terminalFitAddon.fit()
    }, 1)

    this.props.fileChangeWatcher.registerObservers(this.setDirty, this.loadModule)

    window.addEventListener('message', this.processMessage, false)
    this.frameStateManager.startHeartbeat()
    this.resizeObserver.observe(this.termRef.current)
  }

  componentDidUpdate(prevProps: Readonly<ViewPageProps>, prevState: Readonly<ConsoleState>, snapshot?: any): void {
    if (prevProps.fileChangeWatcher !== this.props.fileChangeWatcher) {
      prevProps.fileChangeWatcher.deregisterObservers()
      this.props.fileChangeWatcher.registerObservers(this.setDirty, this.loadModule)
    }
  }

  componentWillUnmount() {
    this.resizeObserver.disconnect()
    this.frameStateManager.stopHeartbeat()
    window.removeEventListener('message', this.processMessage, false)
    this.props.fileChangeWatcher.deregisterObservers()
  }
}