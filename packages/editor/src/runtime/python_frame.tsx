import './python_frame.css'
import './terminal.css'
import 'tslib'
import 'xterm/css/xterm.css'
import React, { Component } from 'react'
import WasmTTY from './wasm-tty/wasm-tty'
import { Allotment } from 'allotment'
import { Box, Button, ButtonGroup, Select } from '@chakra-ui/react'
import { EditorMessage } from '@splootcode/runtime-python'
import { FitAddon } from 'xterm-addon-fit'
import { HTTPResponse, RunType } from '@splootcode/core'
import { ResponseViewer } from './response_viewer'
import { RuntimeContextManager } from 'src/context/runtime_context_manager'
import { Terminal } from 'xterm'
import { observer } from 'mobx-react'

export interface RuntimeToken {
  token: string
  expiry: Date
}

type PythonFrameProps = {
  runtimeContextManager: RuntimeContextManager
  frameScheme: 'http' | 'https'
  frameDomain: string
  refreshToken?: () => Promise<RuntimeToken>
}

interface ConsoleState {
  frameSrc: string
  responseData?: HTTPResponse
}

@observer
export class PythonFrame extends Component<PythonFrameProps, ConsoleState> {
  private frameRef: React.RefObject<HTMLIFrameElement>
  private termRef: React.RefObject<HTMLDivElement>
  private term: Terminal
  private terminalFitAddon: FitAddon
  private resolveActiveInput?: (s: string) => void
  private wasmTty: WasmTTY
  private pasteLinesBuffer: string[]
  private resizeObserver: ResizeObserver

  constructor(props: PythonFrameProps) {
    super(props)
    this.frameRef = React.createRef()
    this.termRef = React.createRef()
    this.resolveActiveInput = null
    this.wasmTty = null
    this.pasteLinesBuffer = []
    this.resizeObserver = new ResizeObserver((entries) => {
      this.handleResize()
    })

    const runType = this.props.runtimeContextManager.runSettings.runType
    this.state = {
      frameSrc: this.getFrameSrc(runType),
      responseData: null,
    }
  }

  render() {
    const { runtimeContextManager } = this.props
    const ready = runtimeContextManager.ready
    const running = runtimeContextManager.running
    const runSettings = runtimeContextManager.runSettings

    const iframeClass = runSettings.runType === RunType.STREAMLIT ? 'streamlit-frame' : 'view-python-frame'

    if (runSettings.runType === RunType.STREAMLIT) {
      return (
        <div id="python-frame-container">
          <iframe ref={this.frameRef} className={iframeClass} src={this.state.frameSrc} allow="cross-origin-isolated" />
          <Box pl="3" pt="3" height={'100%'} backgroundColor="#040810">
            <Box id="terminal" ref={this.termRef}></Box>
          </Box>
        </div>
      )
    }

    return (
      <div id="python-frame-container">
        <div id="terminal-container">
          <Box className="terminal-menu" px="3">
            <ButtonGroup size="md" my={1} height={8}>
              {runSettings.runType === RunType.HTTP_REQUEST ? (
                <Select
                  size="sm"
                  variant={'filled'}
                  backgroundColor="gray.800"
                  value={runtimeContextManager.selectedHTTPScenarioID || ''}
                  placeholder="Choose test request"
                  onChange={(e) => {
                    this.setState({ responseData: null })
                    if (!e.target.value) {
                      runtimeContextManager.updateSelectedHTTPScenarioID(null)
                      return
                    }

                    const id = parseInt(e.target.value)
                    runtimeContextManager.updateSelectedHTTPScenarioID(id)
                  }}
                >
                  {runSettings.httpScenarios.map((scenario, i) => {
                    return (
                      <option key={i} value={scenario.id}>
                        {scenario.name}
                      </option>
                    )
                  })}
                </Select>
              ) : null}

              <Button
                size={'sm'}
                isLoading={running}
                loadingText="Running"
                colorScheme="blue"
                onClick={this.run}
                disabled={!(ready && !running)}
                height={8}
                minWidth={'100px'}
              >
                Run
              </Button>
              <Button size="sm" disabled={!running} onClick={this.stop} height={8}>
                Stop
              </Button>
            </ButtonGroup>
          </Box>

          <Allotment vertical>
            <Allotment.Pane visible={runSettings.runType === RunType.HTTP_REQUEST}>
              {runSettings.runType === RunType.HTTP_REQUEST ? (
                <ResponseViewer response={this.state.responseData} />
              ) : null}
            </Allotment.Pane>

            <Allotment.Pane>
              <Box pl="3" pt="3" height={'100%'} backgroundColor="#040810">
                <Box id="terminal" ref={this.termRef}></Box>
              </Box>
            </Allotment.Pane>
          </Allotment>
        </div>

        <iframe
          ref={this.frameRef}
          className={iframeClass}
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
    this.props.runtimeContextManager.run()
  }

  rerun = async () => {
    this.wasmTty.clearTty()
    this.term.clear()
    this.props.runtimeContextManager.run()
  }

  stop = () => {
    if (this.resolveActiveInput) {
      this.resolveActiveInput('')
    }
    this.props.runtimeContextManager.stop()
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

  getFrameSrc = (runType: RunType) => {
    const rand = Math.floor(Math.random() * 1000000 + 1)
    if (runType === RunType.STREAMLIT) {
      return this.getFrameDomain() + '/splootstreamlitpythonclient.html' + '?a=' + rand
    }
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
    if (event.data.stCommVersion) {
      // Ignore stlite messages.
      return
    }
    const data = event.data as EditorMessage
    if (event.origin !== this.getFrameDomain()) {
      return
    }
    if (!data.type) {
      return
    }

    switch (data.type) {
      case 'ready':
        this.props.runtimeContextManager.setReady()
        break
      case 'running':
        this.term.clear()
        this.wasmTty.clearTty()
        this.props.runtimeContextManager.setRunning()
        break
      case 'disabled':
        this.props.runtimeContextManager.setDisabled()
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
        this.wasmTty.print(data.stdout)
        break
      case 'stderr':
        this.wasmTty.print(data.stderr)
        break
      case 'heartbeat':
      case 'runtime_capture':
      case 'module_info':
      case 'text_code_content':
        this.props.runtimeContextManager.handleMessageFromRuntime(data)
        break
      case 'refresh_token':
        this.refreshToken()
        break
      case 'web_response':
        const response = data.response as HTTPResponse

        this.setState({
          responseData: response,
        })

        break
      case 'expression_type_info':
        if (this.props.runtimeContextManager.requestExpressionTypeInfoHandler) {
          this.props.runtimeContextManager.requestExpressionTypeInfoHandler(data.response)
        }
        break
      default:
        console.warn('Unknown event from frame: ', event)
    }
  }

  refreshToken = async () => {
    if (!this.props.refreshToken) {
      console.warn('No refresh token refresh function provided.')
      this.postMessageToFrame({
        type: 'token',
        token: null,
        expiry: null,
      })
      return
    }

    const tokenInfo = await this.props.refreshToken()
    this.postMessageToFrame({
      type: 'token',
      token: tokenInfo.token,
      expiry: tokenInfo.expiry,
    })
  }

  loadModule = (moduleName: string) => {
    this.postMessageToFrame({
      type: 'module_info',
      moduleName: moduleName,
    })
  }

  reloadFrame = () => {
    const runType = this.props.runtimeContextManager.runSettings.runType
    this.frameRef.current.src = this.getFrameSrc(runType)
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

  componentDidMount() {
    this.term = new Terminal({
      scrollback: 10000,
      fontSize: 15,
      theme: { background: '#040810' },
      fontFamily: 'Inconsolata, monospace',
    })
    this.wasmTty = new WasmTTY(this.term)
    this.terminalFitAddon = new FitAddon()
    this.term.loadAddon(this.terminalFitAddon)
    this.term.open(this.termRef.current)
    this.term.onData(this.handleTermData)
    setTimeout(() => {
      this.terminalFitAddon.fit()
    }, 1)

    this.props.runtimeContextManager.registerIFrameAccess(this.postMessageToFrame, this.reloadFrame)
    window.addEventListener('message', this.processMessage, false)

    this.resizeObserver.observe(this.termRef.current)
  }

  componentDidUpdate(prevProps: Readonly<PythonFrameProps>, prevState: Readonly<ConsoleState>, snapshot?: any): void {
    if (this.props.runtimeContextManager !== prevProps.runtimeContextManager) {
      prevProps.runtimeContextManager.deregisterIFrameAccess()
      this.props.runtimeContextManager.registerIFrameAccess(this.postMessageToFrame, this.reloadFrame)
    }
  }

  componentWillUnmount() {
    this.resizeObserver.disconnect()
    window.removeEventListener('message', this.processMessage, false)
    this.props.runtimeContextManager.deregisterIFrameAccess()
  }
}
