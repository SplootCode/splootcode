import { Dependency, HTTPRequestAWSEvent, HTTPResponse, RunType } from '@splootcode/core'
import { EditorMessage, LoadDependenciesMessage } from '../message_types'
import { ExpressionTypeRequest, ExpressionTypeResponse, ParseTrees } from '@splootcode/language-python'

export enum FetchSyncErrorType {
  NO_RECORDED_REQUEST = 'NO_RECORDED_REQUEST',
  FETCH_ERROR = 'FETCH_ERROR',
}

export type FileSpec = SplootFile | BlobFile
export interface SplootFile {
  type: 'sploot'
  content: any // SerializedNode
}

export interface BlobFile {
  type: 'blob'
  content: Uint8Array
}

export interface FetchData {
  method: string
  url: string
  headers: { [key: string]: string }
  body: Uint8Array | string
}

export interface FetchHandler {
  setToken: (token: string, expiry: Date) => void
  fetch: (fetchData: FetchData, sendToParent: (payload: EditorMessage) => void) => Promise<ResponseData>
}

export interface ResponseData {
  completedResponse?: {
    status: number
    reason: string
    headers: { [key: string]: string }
  }
  body?: Uint8Array
  error?: {
    type: FetchSyncErrorType
    message: string
  }
}

export interface AutoCompleteWorkerExpressionTypeInfoResponse {
  type: 'expression_type_info'
  response: ExpressionTypeResponse
}

// messages from the autocomplete worker to the worker manager
export type AutocompleteWorkerMessage = { type: 'ready' } | AutoCompleteWorkerExpressionTypeInfoResponse

export interface WorkerFetchMessage {
  type: 'fetch'
  data: {
    method: string
    url: string
    headers: { [key: string]: string }
    body: Uint8Array | string
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
  captures: Map<string, any>
}

export interface WorkerWebResponseMessage {
  type: 'web_response'
  response: HTTPResponse
}

export interface WorkerModuleInfoMessage {
  type: 'module_info'
  info: any
}

export interface WorkerTextConvertResultMessage {
  type: 'text_code_content'
  fileContents: Map<string, string>
  return_to_editor: boolean
}

export interface WorkerExpressionTypeResultMessage {
  type: 'expression_type_info'
  response: ExpressionTypeResponse
}

// messages from the runtime to the worker manager
export type WorkerMessage =
  | { type: 'ready' | 'stdin' | 'finished' | 'continueFetch' }
  | WorkerStdoutMessage
  | WorkerStderrMessage
  | WorkerInputValueMessage
  | WorkerFetchMessage
  | WorkerRuntimeCaptureMessage
  | WorkerModuleInfoMessage
  | WorkerWebResponseMessage
  | WorkerTextConvertResultMessage

export interface WorkerRunMessage {
  type: 'run'
  runType: RunType
  eventData: HTTPRequestAWSEvent
  workspace: Map<string, FileSpec>
  envVars: Map<string, string>
  stdinBuffer: Int32Array
  fetchBuffer: Uint8Array
  fetchBufferMeta: Int32Array
}

export interface WorkerRerunMessage {
  type: 'rerun'
  runType: RunType
  eventData: HTTPRequestAWSEvent
  workspace: Map<string, FileSpec>
  envVars: Map<string, string>
  readlines: string[]
  requestPlayback: Map<string, ResponseData[]>
  dependencies: Dependency[]
}

export interface LoadModuleMessage {
  type: 'loadModule'
  moduleName: string
}

export interface TextContentRequestMessage {
  type: 'generate_text_code'
  runType: RunType
  workspace: Map<string, FileSpec>
  return_to_editor: boolean
}

export interface LoadParseTreesMessage {
  type: 'parse_trees'
  parseTrees: ParseTrees
}

export interface RequestExpressionTypeInfoMessage {
  type: 'request_expression_type_info'
  request: ExpressionTypeRequest
}

// messages from the worker manager to the runtime worker
export type WorkerManagerMessage =
  | WorkerRunMessage
  | WorkerRerunMessage
  | LoadModuleMessage
  | TextContentRequestMessage
  | LoadDependenciesMessage

// messages worker manager to the autocomplete worker
export type WorkerManagerAutocompleteMessage =
  | RequestExpressionTypeInfoMessage
  | LoadParseTreesMessage
  | LoadDependenciesMessage

export function compareMap(a: Map<string, string>, b: Map<string, string>) {
  if (a.size !== b.size) {
    return false
  }
  for (const [key, value] of a) {
    if (value !== b.get(key)) {
      return false
    }
  }
  return true
}

export function sameDepencencies(a: Dependency[], b: Dependency[]) {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    const idx = b.findIndex((dep) => dep.name === a[i].name && dep.version === a[i].version) // TODO(check ID here?)
    if (idx === -1) {
      return false
    }
  }

  return true
}
