import 'tslib'

import { WorkerManager, WorkerState } from './worker-manager'

export enum FrameState {
  DEAD = 0,
  LOADING,
  LIVE,
  UNMOUNTED,
}

class RuntimeStateManager {
  private parentWindowDomain: string
  private workerURL: string
  private workerManager: WorkerManager
  private nodeTree: any
  private nodeTreeLoaded: boolean
  private stdinPromiseResolve: (s: string) => void

  constructor(parentWindowDomain: string, workerURL: string) {
    this.parentWindowDomain = parentWindowDomain
    this.workerURL = workerURL
  }

  sendToParent = (payload) => {
    parent.postMessage(payload, this.parentWindowDomain)
  }

  getTerminalInput = async () => {
    const promise = new Promise<string>((resolve) => {
      this.stdinPromiseResolve = resolve
    })
    this.sendToParent({ type: 'stdin' })
    return promise
  }

  handleStdinInput = (text: string) => {
    if (this.stdinPromiseResolve) {
      this.stdinPromiseResolve(text)
      this.stdinPromiseResolve = null
    }
  }

  initialiseWorkerManager = () => {
    this.workerManager = new WorkerManager(
      this.parentWindowDomain,
      this.workerURL,
      {
        stdin: this.getTerminalInput,
        stdout: (s: string) => {
          // Send stdout to parent
          this.sendToParent({ type: 'stdout', stdout: s })
        },
        stderr: (s: string) => {
          // send stderr to parent.
          this.sendToParent({ type: 'stderr', stderr: s })
        },
      },
      (state: WorkerState) => {
        if (state === WorkerState.READY) {
          if (this.nodeTreeLoaded) {
            this.sendToParent({ type: 'ready' })
          } else {
            this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LOADING } })
          }
        } else if (state === WorkerState.DISABLED) {
          this.sendToParent({ type: 'disabled' })
        } else if (state === WorkerState.RUNNING) {
          this.sendToParent({ type: 'running' })
        }
      }
    )
  }

  handleMessage = (event: MessageEvent) => {
    const data = event.data
    if (data.type && data.type.startsWith('webpack')) {
      // Ignore webpack devserver
      return
    }

    switch (data.type) {
      case 'heartbeat':
        if (this.nodeTreeLoaded) {
          this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        } else {
          this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LOADING } })
        }
        break
      case 'nodetree':
        this.nodeTree = data.data.tree
        this.nodeTreeLoaded = true
        this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.workerManager.workerState === WorkerState.READY) {
          this.workerManager.rerun(this.nodeTree)
        }
        break
      case 'stdin':
        const text = event.data.stdin
        this.handleStdinInput(text)
        break
      case 'run':
        if (this.nodeTreeLoaded) {
          this.workerManager.run(this.nodeTree)
        } else {
          console.warn('Cannot run, no nodetree loaded')
        }
        break
      case 'stop':
        if (this.stdinPromiseResolve) {
          this.stdinPromiseResolve = null
        }
        this.workerManager.stop()
        break
      case 'module_info':
        this.workerManager.loadModule(data.moduleName)
        break
      default:
        console.warn('Unrecognised message recieved:', event.data)
    }
  }
}

let runtimeStateManager: RuntimeStateManager

export function initialize(editorDomain: string, workerURL: string) {
  runtimeStateManager = new RuntimeStateManager(editorDomain, workerURL)
  window.addEventListener('message', runtimeStateManager.handleMessage, false)
  runtimeStateManager.initialiseWorkerManager()
}
