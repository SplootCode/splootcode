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
  private stdinbuffer: SharedArrayBuffer
  private stdinbufferInt: Int32Array
  private leftoverInput: string
  private inputPlayback: string[]
  private stateCallBack: (state: WorkerState) => void

  constructor(workerURL: string, standardIO: StandardIO, stateCallback: (state: WorkerState) => void) {
    this.workerURL = workerURL
    this.worker = null
    this.standardIO = standardIO
    this.stateCallBack = stateCallback

    this.initialiseWorker()
  }

  initialiseWorker() {
    if (!this.worker) {
      this.worker = new Worker(this.workerURL)
      this.worker.addEventListener('message', this.handleMessageFromWorker)
    }
  }

  run(nodeTree: any) {
    this.inputPlayback = []
    this.stdinbuffer = new SharedArrayBuffer(INPUT_BUF_SIZE * Int32Array.BYTES_PER_ELEMENT)
    this.stdinbufferInt = new Int32Array(this.stdinbuffer)
    this.stdinbufferInt[0] = -1
    this.worker.postMessage({
      type: 'run',
      nodetree: nodeTree,
      buffer: this.stdinbuffer,
    })
  }

  rerun(nodeTree: any) {
    this.worker.postMessage({
      type: 'rerun',
      nodetree: nodeTree,
      readlines: this.inputPlayback,
    })
  }

  async provideStdin() {
    let inputValue = this.leftoverInput
    if (!inputValue) {
      inputValue = await this.standardIO.stdin()
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

    if (this.stdinbuffer && this.stdinbufferInt) {
      let startingIndex = 1
      if (this.stdinbufferInt[0] > 0) {
        startingIndex = this.stdinbufferInt[0]
      }
      data.forEach((value, index) => {
        this.stdinbufferInt[startingIndex + index] = value
      })

      this.stdinbufferInt[0] = startingIndex + data.length - 1
      Atomics.notify(this.stdinbufferInt, 0, 1)
    }
  }

  stop() {
    this.stateCallBack(WorkerState.DISABLED)
    this.worker.removeEventListener('message', this.handleMessageFromWorker)
    this.worker.terminate()
    this.worker = null
  }

  handleMessageFromWorker = (event) => {
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
    } else if (type === 'runtime_capture') {
      parent.postMessage(event.data, process.env.EDITOR_DOMAIN)
    } else if (type === 'finished') {
      this.stateCallBack(WorkerState.READY)
    }
  }
}
