import { ResponseData, WorkerManagerMessage, WorkerMessage } from './common'

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
  private workerURL: string
  private worker: Worker
  private standardIO: StandardIO
  private stdinbuffer: Int32Array
  private fetchBuffer: Uint8Array
  private fetchBufferMeta: Int32Array
  private leftoverInput: string
  private inputPlayback: string[]
  private requestPlayback: Map<string, ResponseData[]>
  private stateCallBack: (state: WorkerState) => void

  constructor(workerURL: string, standardIO: StandardIO, stateCallback: (state: WorkerState) => void) {
    this.workerURL = workerURL
    this.worker = null
    this.standardIO = standardIO
    this.inputPlayback = []
    this.stateCallBack = stateCallback

    this.initialiseWorker()
  }

  initialiseWorker() {
    if (!this.worker) {
      this.worker = new Worker(this.workerURL)
      this.worker.addEventListener('message', this.handleMessageFromWorker)
    }
  }

  sendMessage(message: WorkerManagerMessage) {
    this.worker.postMessage(message)
  }

  run(nodeTree: any) {
    this.inputPlayback = []
    this.requestPlayback = new Map()
    this.stdinbuffer = new Int32Array(new SharedArrayBuffer(INPUT_BUF_SIZE * Int32Array.BYTES_PER_ELEMENT))
    this.stdinbuffer[0] = -1

    this.fetchBuffer = new Uint8Array(new SharedArrayBuffer(128 * 1024))
    this.fetchBufferMeta = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3))

    this.sendMessage({
      type: 'run',
      nodetree: nodeTree,
      stdinBuffer: this.stdinbuffer,
      fetchBuffer: this.fetchBuffer,
      fetchBufferMeta: this.fetchBufferMeta,
    })
  }

  rerun(nodeTree: any) {
    this.sendMessage({
      type: 'rerun',
      nodetree: nodeTree,
      readlines: this.inputPlayback,
      requestPlayback: this.requestPlayback,
    })
  }

  loadModule(moduleName: string) {
    this.sendMessage({
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

  handleFetch(fetchData: { method: string; url: string; headers: { [key: string]: string }; body: Uint8Array }) {
    const serializedRequest = JSON.stringify(fetchData)
    fetch(fetchData.url, {
      method: fetchData.method,
      headers: fetchData.headers,
    }).then((response) => {
      const responseData: ResponseData = {
        completedResponse: {
          status: response.status,
          reason: response.statusText,
          /* @ts-ignore */
          headers: Object.fromEntries(response.headers.entries()),
        },
      }

      response.arrayBuffer().then((bodyBuffer) => {
        const body = new Uint8Array(bodyBuffer)
        const encoder = new TextEncoder()
        const bytes = encoder.encode(JSON.stringify(responseData))

        // Encode the response body separately (bytes don't JSON serialize well)
        responseData.body = body
        if (this.requestPlayback.has(serializedRequest)) {
          this.requestPlayback.get(serializedRequest).push(responseData)
        } else {
          this.requestPlayback.set(serializedRequest, [responseData])
        }
        this.fetchBuffer.set(bytes, 0)
        this.fetchBuffer.set(body, bytes.length)
        Atomics.store(this.fetchBufferMeta, 1, bytes.length)
        Atomics.store(this.fetchBufferMeta, 2, body.length)
        Atomics.store(this.fetchBufferMeta, 0, 1)
        Atomics.notify(this.fetchBufferMeta, 0)
      })
    })
  }

  stop() {
    this.standardIO.stderr('\r\nProgram Stopped.\r\n')
    this.stateCallBack(WorkerState.DISABLED)
    this.worker.removeEventListener('message', this.handleMessageFromWorker)
    this.worker.terminate()
    this.worker = null
    this.initialiseWorker()
  }

  handleMessageFromWorker = (event: MessageEvent<WorkerMessage>) => {
    const type = event.data.type
    if (type === 'ready') {
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
    } else if (type === 'runtime_capture' || type === 'module_info') {
      parent.postMessage(event.data, process.env.EDITOR_DOMAIN)
    } else if (type === 'finished') {
      this.stateCallBack(WorkerState.READY)
    } else {
      console.warn(`Unrecognised message from worker: ${type}`)
    }
  }
}
