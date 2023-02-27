import 'tslib'
import { EditorMessage, FetchData, FetchHandler, FetchSyncErrorType, FileSpec, ResponseData } from './common'

import { WorkerManager, WorkerState } from './worker-manager'

export enum FrameState {
  DEAD = 0,
  REQUESTING_INITIAL_FILES,
  LIVE,
  UNMOUNTED,
}

class RuntimeStateManager {
  private parentWindowDomain: string
  private parentWindowDomainRegex: string
  private workerURL: string
  private workerManager: WorkerManager
  private workspace: Map<string, FileSpec>
  private envVars: Map<string, string>
  private initialFilesLoaded: boolean
  private stdinPromiseResolve: (s: string) => void
  private fetchHandler: FetchHandler
  private handlerFunction: string
  private stlite_app: any

  constructor(parentWindowDomainRegex: string, workerURL: string, fetchHandler: FetchHandler) {
    this.parentWindowDomain = null
    this.parentWindowDomainRegex = parentWindowDomainRegex
    this.workerURL = workerURL
    this.initialFilesLoaded = false
    this.workspace = new Map()
    this.envVars = new Map()
    this.fetchHandler = fetchHandler
    this.handlerFunction = ''
    this.stlite_app = null
  }

  sendToParent = (payload: EditorMessage) => {
    console.log('Sending', payload)
    if (this.parentWindowDomain) {
      parent.postMessage(payload, this.parentWindowDomain)
    } else if (payload.type === 'heartbeat') {
      // Only allow heartbeat messages to go to any origin.
      parent.postMessage(payload, '*')
    }
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
      },
      this.sendToParent,
      this.fetchHandler,
      this.textFileValueCallback
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

  setEnvironmentVars(envVars: Map<string, string>) {
    this.envVars = envVars
  }

  initializeStlite() {
    // @ts-ignore
    // await import()

    // @ts-ignore
    console.log(window.stlite)
    // @ts-ignore
    this.stlite_app = stlite.mount(
      {
        requirements: [], // Packages to install
        entrypoint: 'main.py', // The target file of the `streamlit run` command
        files: {
          'main.py': `
import streamlit as st
`,
        },
      },
      document.getElementById('root')
    )
    console.log(this.stlite_app)
    if (this.initialFilesLoaded) {
      this.sendToParent({ type: 'ready' })
    } else {
      this.sendToParent({ type: 'heartbeat', data: { state: FrameState.REQUESTING_INITIAL_FILES } })
    }
  }

  textFileValueCallback = (fileName: string, text: string) => {
    console.log('Text file value callback', fileName, text)
    this.updateStliteFiles(fileName, text)
  }

  updateStliteFiles = (fileName: string, text: string) => {
    console.log('Updating files')
    if (this.stlite_app) {
      if (fileName.endsWith('.py')) {
        this.stlite_app.writeFile(fileName, text)
      }
    }
  }

  handleMessage = (event: MessageEvent) => {
    const data = event.data
    if (data.type && data.type.startsWith('webpack')) {
      // Ignore webpack devserver
      return
    }
    if (this.parentWindowDomain) {
      if (event.origin !== this.parentWindowDomain) {
        console.warn('Ignoring message from unknown origin', event.origin)
        return
      }
    } else if (event.origin.match(this.parentWindowDomainRegex)) {
      this.parentWindowDomain = event.origin
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
        this.handlerFunction = data.handlerFunction
        this.addFilesToWorkspace(data.data.files as Map<string, FileSpec>, false)
        this.setEnvironmentVars(data.data.envVars)
        if (this.workerManager.workerState === WorkerState.READY) {
          this.workerManager.rerun(this.handlerFunction, this.workspace, this.envVars)
        }
        break
      case 'initialfiles':
        this.handlerFunction = data.handlerFunction
        this.addFilesToWorkspace(data.data.files as Map<string, FileSpec>, true)
        this.setEnvironmentVars(data.data.envVars)
        this.initialFilesLoaded = true
        this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.workerManager.workerState === WorkerState.READY) {
          this.workerManager.rerun(this.handlerFunction, this.workspace, this.envVars)
        }
        break
      case 'stdin':
        const text = event.data.stdin
        this.handleStdinInput(text)
        break
      case 'token':
        this.fetchHandler.setToken(event.data.token, event.data.expiry)
        break
      case 'run':
        this.handlerFunction = data.handlerFunction
        if (this.initialFilesLoaded) {
          this.workerManager.run(this.handlerFunction, this.workspace, this.envVars)
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

const defaultFetchHandler: FetchHandler = {
  setToken(token, expiry) {
    // Do nothing
  },
  fetch: async (fetchData: FetchData) => {
    try {
      const response = await fetch(fetchData.url, {
        headers: fetchData.headers,
        body: fetchData.body,
      })

      const headersObj = {}
      response.headers.forEach((value, key) => {
        headersObj[key] = value
      })

      const responseData: ResponseData = {
        completedResponse: {
          status: response.status,
          reason: response.statusText,
          headers: headersObj,
        },
      }

      const bodyBuffer = await response.arrayBuffer()
      responseData.body = new Uint8Array(bodyBuffer)
      return responseData
    } catch (e) {
      console.warn(e)
      const responseData: ResponseData = {
        error: {
          type: FetchSyncErrorType.FETCH_ERROR,
          message: e.message,
        },
      }
      responseData.body = new Uint8Array(0)
      return responseData
    }
  },
}

export function initialize(
  editorDomainRegex: string,
  workerURL: string,
  requestHandler: FetchHandler = defaultFetchHandler
) {
  runtimeStateManager = new RuntimeStateManager(editorDomainRegex, workerURL, requestHandler)
  window.addEventListener('message', runtimeStateManager.handleMessage, false)
  runtimeStateManager.initialiseWorkerManager()
  runtimeStateManager.initializeStlite()
}
