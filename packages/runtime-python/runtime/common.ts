export interface ResponseData {
  completedResponse?: {
    status: number
    reason: string
    headers: { [key: string]: string }
  }
  body?: Uint8Array
}

export interface WorkerFetchMessage {
  type: 'fetch'
  data: {
    method: string
    url: string
    headers: { [key: string]: string }
    body: Uint8Array
  }
}

export interface WorkerStdoutMessage {
  type: 'stdout'
  stdout: string
}

export interface WorkerStderrMessage {
  type: 'stderr'
  stderr: string
}

export interface WorkerInputValueMessage {
  type: 'inputValue'
  value: string
}

export interface WorkerRuntimeCaptureMessage {
  type: 'runtime_capture'
  capture: any
}

export interface WorkerModuleInfoMessage {
  type: 'module_info'
  info: any
}

export type WorkerMessage =
  | { type: 'ready' | 'stdin' | 'finished' }
  | WorkerStdoutMessage
  | WorkerStderrMessage
  | WorkerInputValueMessage
  | WorkerFetchMessage
  | WorkerRuntimeCaptureMessage
  | WorkerModuleInfoMessage

export interface RunMessage {
  type: 'run'
  nodetree: any
  stdinBuffer: Int32Array
  fetchBuffer: Uint8Array
  fetchBufferMeta: Int32Array
}

export interface RerunMessage {
  type: 'rerun'
  nodetree: any
  readlines: string[]
  requestPlayback: Map<string, ResponseData[]>
}

export interface LoadModuleMessage {
  type: 'loadModule'
  moduleName: string
}

export type WorkerManagerMessage = RunMessage | RerunMessage | LoadModuleMessage
