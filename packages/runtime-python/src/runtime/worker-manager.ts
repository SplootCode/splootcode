import { Dependency, HTTPRequestAWSEvent, RunType } from '@splootcode/core'
import { EditorMessage } from '../message_types'
import { FetchHandler, FileSpec, ResponseData, WorkerManagerMessage, WorkerMessage } from './common'

const INPUT_BUF_SIZE = 100

export interface StandardIO {
  stdin: () => Promise<string>
  stdout: (s: string) => void
  stderr: (s: string) => void
}

export enum WorkerState {
  DISABLED = 0,
  READY,
  RUNNING,
}

export class WorkerManager {
  private RuntimeWorker: new () => Worker
  private runtimeWorker: Worker

  private standardIO: StandardIO
  private stdinbuffer: Int32Array
  private fetchHandler: FetchHandler
  private fetchBuffer: Uint8Array
  private fetchBufferMeta: Int32Array
  private leftoverInput: string
  private leftoverFetch: Uint8Array
  private inputPlayback: string[]
  private requestPlayback: Map<string, ResponseData[]>
  private stateCallBack: (state: WorkerState) => void
  private sendToParentWindow: (payload: EditorMessage) => void
  private _workerState: WorkerState
  private textFileValueCallback: (fileContents: Map<string, string>) => void

  public get workerState() {
    return this._workerState
  }

  constructor(
    RuntimeWorker: new () => Worker,
    standardIO: StandardIO,
    stateCallback: (state: WorkerState) => void,
    sendToParentWindow: (payload: EditorMessage) => void,
    fetchHandler: FetchHandler,
    textFileValueCallback: (fileContents: Map<string, string>) => void
  ) {
    this.sendToParentWindow = sendToParentWindow
    this.RuntimeWorker = RuntimeWorker
    this.runtimeWorker = null
    this.standardIO = standardIO
    this.inputPlayback = []
    this.requestPlayback = new Map()
    this._workerState = WorkerState.DISABLED
    this.stateCallBack = stateCallback
    this.fetchHandler = fetchHandler
    this.textFileValueCallback = textFileValueCallback

    this.initialiseWorker()
  }

  initialiseWorker() {
    if (!this.runtimeWorker) {
      this.runtimeWorker = new this.RuntimeWorker()
      this.runtimeWorker.addEventListener('message', this.handleMessageFromWorker)
    }
  }

  sendMessge(message: WorkerManagerMessage) {
    this.runtimeWorker.postMessage(message)
  }

  run(
    runType: RunType,
    eventData: HTTPRequestAWSEvent,
    workspace: Map<string, FileSpec>,
    envVars: Map<string, string>
  ) {
    this.inputPlayback = []
    this.requestPlayback = new Map()
    this.stdinbuffer = new Int32Array(new SharedArrayBuffer(INPUT_BUF_SIZE * Int32Array.BYTES_PER_ELEMENT))
    this.stdinbuffer[0] = -1

    this.fetchBuffer = new Uint8Array(new SharedArrayBuffer(128 * 1024))
    this.fetchBufferMeta = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3))
    this._workerState = WorkerState.RUNNING
    this.stateCallBack(this._workerState)
    this.sendMessge({
      type: 'run',
      runType: runType,
      eventData: eventData,
      workspace: workspace,
      envVars: envVars,
      stdinBuffer: this.stdinbuffer,
      fetchBuffer: this.fetchBuffer,
      fetchBufferMeta: this.fetchBufferMeta,
    })
  }

  rerun(
    runType: RunType,
    eventData: HTTPRequestAWSEvent,
    workspace: Map<string, FileSpec>,
    envVars: Map<string, string>,
    dependencies: Dependency[]
  ) {
    this._workerState = WorkerState.RUNNING
    this.stateCallBack(this._workerState)
    this.sendMessge({
      type: 'rerun',
      runType: runType,
      eventData: eventData,
      workspace: workspace,
      envVars: envVars,
      readlines: this.inputPlayback,
      requestPlayback: this.requestPlayback,
      dependencies: dependencies,
    })
  }

  generateTextCode(runType: RunType, workspace: Map<string, FileSpec>, returnToEditor: boolean) {
    if (!returnToEditor) {
      // Don't mark as 'RUNNING' just for text code generation.
      this._workerState = WorkerState.RUNNING
      this.stateCallBack(this._workerState)
    }
    this.sendMessge({
      type: 'generate_text_code',
      runType: runType,
      workspace: workspace,
      return_to_editor: returnToEditor,
    })
  }

  loadModule(moduleName: string) {
    this.sendMessge({
      type: 'loadModule',
      moduleName: moduleName,
    })
  }

  async provideStdin() {
    let inputValue = this.leftoverInput
    if (!inputValue) {
      try {
        inputValue = await this.standardIO.stdin()
      } catch {
        // TODO: In future we can send a signal to the worker to
        // exit cleanly rather than killing the worker.
        this.stop()
      }
    }

    let data = new TextEncoder().encode(inputValue)
    if (data.length > INPUT_BUF_SIZE - 1) {
      const inputArray = Array.from(inputValue)
      const textThatFits = new TextDecoder('utf-8').decode(data.slice(0, INPUT_BUF_SIZE - 1))
      const chars = Math.max(1, Array.from(textThatFits).length - 2)
      data = new TextEncoder().encode(inputArray.slice(0, chars).join(''))
      this.leftoverInput = inputArray.slice(chars).join('')
    } else {
      this.leftoverInput = ''
    }

    if (this.stdinbuffer) {
      let startingIndex = 1
      if (this.stdinbuffer[0] > 0) {
        startingIndex = this.stdinbuffer[0]
      }
      data.forEach((value, index) => {
        this.stdinbuffer[startingIndex + index] = value
      })

      this.stdinbuffer[0] = startingIndex + data.length - 1
      Atomics.notify(this.stdinbuffer, 0, 1)
    }
  }

  async handleFetch(fetchData: {
    method: string
    url: string
    headers: { [key: string]: string }
    body: Uint8Array | string
  }) {
    const serializedRequest = JSON.stringify(fetchData)

    // Execute fetch
    const responseData = await this.fetchHandler.fetch(fetchData, this.sendToParentWindow)

    const encoder = new TextEncoder()
    const headerBytes = encoder.encode(JSON.stringify(responseData))

    const body = responseData.body
    if (this.requestPlayback.has(serializedRequest)) {
      this.requestPlayback.get(serializedRequest).push(responseData)
    } else {
      this.requestPlayback.set(serializedRequest, [responseData])
    }
    const headerSize = headerBytes.length
    const bodySize = body ? body.length : 0
    Atomics.store(this.fetchBufferMeta, 1, headerSize)
    Atomics.store(this.fetchBufferMeta, 2, bodySize)

    if (headerSize + bodySize < this.fetchBuffer.length) {
      this.fetchBuffer.set(headerBytes, 0)
      if (body) {
        this.fetchBuffer.set(body, headerBytes.length)
      }
      Atomics.store(this.fetchBufferMeta, 0, 1)
      Atomics.notify(this.fetchBufferMeta, 0)
      return
    }

    this.leftoverFetch = new Uint8Array(headerSize + bodySize)
    this.leftoverFetch.set(headerBytes, 0)
    if (body) {
      this.leftoverFetch.set(body, headerSize)
    }
    this.continueFetchResponse()
  }

  continueFetchResponse() {
    if (this.leftoverFetch.length <= this.fetchBuffer.length) {
      this.fetchBuffer.set(this.leftoverFetch, 0)
      this.leftoverFetch = null
    } else {
      const toSend = this.leftoverFetch.subarray(0, this.fetchBuffer.length)
      this.fetchBuffer.set(toSend, 0)
      this.leftoverFetch = this.leftoverFetch.subarray(this.fetchBuffer.length)
    }
    Atomics.store(this.fetchBufferMeta, 0, 1)
    Atomics.notify(this.fetchBufferMeta, 0)
  }

  stop() {
    this.standardIO.stderr('\r\nProgram Stopped.\r\n')
    this._workerState = WorkerState.DISABLED
    this.stateCallBack(WorkerState.DISABLED)

    this.runtimeWorker.removeEventListener('message', this.handleMessageFromWorker)
    this.runtimeWorker.terminate()
    this.runtimeWorker = null

    this.initialiseWorker()
  }

  reloadDependencies() {
    this.standardIO.stderr('\r\nReloading dependencies...\r\n')
    this._workerState = WorkerState.DISABLED
    this.stateCallBack(WorkerState.DISABLED)

    this.runtimeWorker.removeEventListener('message', this.handleMessageFromWorker)
    this.runtimeWorker.terminate()
    this.runtimeWorker = null

    this.initialiseWorker()
  }

  handleMessageFromWorker = (event: MessageEvent<WorkerMessage>) => {
    const type = event.data.type
    if (type === 'ready') {
      this._workerState = WorkerState.READY
      this.stateCallBack(WorkerState.READY)
    } else if (type === 'stdout') {
      this.standardIO.stdout(event.data.stdout)
    } else if (type === 'stderr') {
      this.standardIO.stderr(event.data.stderr)
    } else if (type === 'stdin') {
      this.provideStdin()
    } else if (type === 'inputValue') {
      this.inputPlayback.push(event.data.value)
    } else if (type === 'fetch') {
      const fetchData = event.data.data
      this.handleFetch(fetchData)
    } else if (type === 'continueFetch') {
      this.continueFetchResponse()
    } else if (type === 'runtime_capture' || type === 'module_info' || type === 'web_response') {
      this.sendToParentWindow(event.data)
    } else if (type === 'finished') {
      this._workerState = WorkerState.READY
      this.stateCallBack(WorkerState.READY)
    } else if (type === 'text_code_content') {
      if (event.data.return_to_editor) {
        this.sendToParentWindow(event.data)
      } else {
        this._workerState = WorkerState.READY
        this.stateCallBack(WorkerState.READY)
        this.textFileValueCallback(event.data.fileContents)
      }
    } else {
      console.warn(`Unrecognised message from runtime worker: ${type}`)
    }
  }
}
