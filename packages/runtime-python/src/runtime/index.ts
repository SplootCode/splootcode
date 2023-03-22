import 'tslib'
import { FetchData, FetchHandler, FetchSyncErrorType, FileSpec, ResponseData } from './common'
import { HTTPRequestAWSEvent, RunType } from '@splootcode/core'

import { EditorMessage, FrameState, RuntimeMessage } from '../message_types'
import { WorkerManager, WorkerState } from './worker-manager'

const streamlit_config = `
[server]
runOnSave = true

[browser]
gatherUsageStats = false
`

class RuntimeStateManager {
  private parentWindowDomain: string | null
  private parentWindowDomainRegex: string
  private RuntimeWorker: new () => Worker
  private workerManager: WorkerManager
  private workspace: Map<string, FileSpec>
  private envVars: Map<string, string>
  private initialFilesLoaded: boolean
  private stdinPromiseResolve: null | ((s: string) => void)
  private fetchHandler: FetchHandler
  private runType: RunType
  private eventData: HTTPRequestAWSEvent | null
  private stlite_app: any

  constructor(parentWindowDomainRegex: string, RuntimeWorker: new () => Worker, fetchHandler: FetchHandler) {
    this.parentWindowDomain = null
    this.parentWindowDomainRegex = parentWindowDomainRegex
    this.RuntimeWorker = RuntimeWorker
    this.initialFilesLoaded = false
    this.workspace = new Map()
    this.envVars = new Map()
    this.fetchHandler = fetchHandler
    this.eventData = null
    this.stlite_app = null
  }

  sendToParent = (payload: EditorMessage) => {
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
      this.RuntimeWorker,
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

  initializeStlite(files: Map<string, string>) {
    const initialFiles: { [key: string]: string } = {}
    for (const [fileName, text] of files) {
      if (fileName.endsWith('.py')) {
        initialFiles[fileName] = text
      }
    }
    initialFiles['/home/pyodide/.streamlit/config.toml'] = streamlit_config

    // @ts-ignore
    this.stlite_app = stlite.mount(
      {
        requirements: [],
        entrypoint: 'main.py',
        files: initialFiles,
      },
      document.getElementById('root')
    )
  }

  textFileValueCallback = (fileContents: Map<string, string>) => {
    if (!this.stlite_app) {
      this.initializeStlite(fileContents)
    } else {
      this.updateStliteFiles(fileContents)
    }
  }

  updateStliteFiles = (fileContents: Map<string, string>) => {
    for (const [fileName, text] of fileContents) {
      if (fileName.endsWith('.py')) {
        this.stlite_app.writeFile(fileName, text)
      }
    }
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

  handleMessage = (event: MessageEvent) => {
    const data = event.data as RuntimeMessage
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
        this.runType = data.runType
        this.eventData = data.eventData

        this.addFilesToWorkspace(data.data.files, false)
        this.setEnvironmentVars(data.data.envVars)
        if (this.workerManager.workerState === WorkerState.READY) {
          if (this.runType === RunType.STREAMLIT) {
            this.workerManager.generateTextCode(this.runType, this.workspace)
          } else {
            this.workerManager.rerun(this.runType, this.eventData, this.workspace, this.envVars)
          }
        }
        break
      case 'initialfiles':
        this.runType = data.runType
        this.eventData = data.eventData

        this.addFilesToWorkspace(data.data.files as Map<string, FileSpec>, true)
        this.setEnvironmentVars(data.data.envVars)
        this.initialFilesLoaded = true
        this.sendToParent({ type: 'heartbeat', data: { state: FrameState.LIVE } })
        if (this.workerManager.workerState === WorkerState.READY) {
          if (this.runType === RunType.STREAMLIT) {
            this.workerManager.generateTextCode(this.runType, this.workspace)
          } else {
            this.workerManager.rerun(this.runType, this.eventData, this.workspace, this.envVars)
          }
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
        if (this.initialFilesLoaded) {
          this.workerManager.run(this.runType, this.eventData, this.workspace, this.envVars)
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
      case 'sendParseTree':
        this.workerManager.sendParseTree(data.path, data.module, data.imports)

        break
      case 'requestExpressionTypeInfo':
        this.workerManager.requestExpressionTypeInfo(data.expression)

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
  RuntimeWorker: new () => Worker,
  requestHandler: FetchHandler = defaultFetchHandler
) {
  runtimeStateManager = new RuntimeStateManager(editorDomainRegex, RuntimeWorker, requestHandler)
  window.addEventListener('message', runtimeStateManager.handleMessage, false)
  runtimeStateManager.initialiseWorkerManager()
}
