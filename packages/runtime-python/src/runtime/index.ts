import 'tslib'
import { FileSpec } from './common'

import { WorkerManager, WorkerState } from './worker-manager'

export enum FrameState {
  DEAD = 0,
  REQUESTING_INITIAL_FILES,
  LIVE,
  UNMOUNTED,
}

class RuntimeStateManager {
  private parentWindowDomain: string
  private workerURL: string
  private workerManager: WorkerManager
  private workspace: Map<string, FileSpec>
  private initialFilesLoaded: boolean
  private stdinPromiseResolve: (s: string) => void

  constructor(parentWindowDomain: string, workerURL: string) {
    this.parentWindowDomain = parentWindowDomain
    this.workerURL = workerURL
    this.initialFilesLoaded = false
    this.workspace = new Map()
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
          if (this.initialFilesLoaded) {
            this.sendToParent({ type: 'ready' })
          } else {
            this.sendToParent({ type: 'heartbeat', data: { state: FrameState.REQUESTING_INITIAL_FILES } })
          }
        } else if (state === WorkerState.DISABLED) {
          this.sendToParent({ type: 'disabled' })
        } else if (state === WorkerState.RUNNING) {
          this.sendToParent({ type: 'running' })
        }
      }
    )
  }

  addFilesToWorkspace(files: Map<string, FileSpec>, isInitial: boolean) {
    const workspace = isInitial ? new Map<string, FileSpec>() : this.workspace
    for (const [filename, file] of files) {
      workspace.set(filename, file)
    }
    this.workspace = workspace
    if (isInitial) {
      this.initialFilesLoaded = true
    }
  }

  handleMessage = (event: MessageEvent) => {
    const data = event.data
    if (data.type && data.type.startsWith('webpack')) {
      // Ignore webpack devserver
      return
    }

    switch (data.type) {
      case 'heartbeat':
        if (this.initialFilesLoaded) {
          this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        } else {
          this.sendToParent({ type: 'heartbeat', data: { state: FrameState.REQUESTING_INITIAL_FILES } })
        }
        break
      case 'updatedfiles':
        this.addFilesToWorkspace(data.data.files as Map<string, FileSpec>, false)
        if (this.workerManager.workerState === WorkerState.READY) {
          this.workerManager.rerun(this.workspace)
        }
        break
      case 'initialfiles':
        this.addFilesToWorkspace(data.data.files as Map<string, FileSpec>, true)
        this.initialFilesLoaded = true
        this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.workerManager.workerState === WorkerState.READY) {
          this.workerManager.rerun(this.workspace)
        }
        break
      case 'stdin':
        const text = event.data.stdin
        this.handleStdinInput(text)
        break
      case 'run':
        if (this.initialFilesLoaded) {
          this.workerManager.run(this.workspace)
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
