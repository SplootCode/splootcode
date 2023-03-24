import { EditorMessage } from '../message_types'
import { ExpressionTypeRequest, ExpressionTypeResponse, ParseTreeInfo, ParseTrees } from '@splootcode/language-python'
import { HTTPRequestAWSEvent, HTTPResponse, RunType } from '@splootcode/core'

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
  | WorkerExpressionTypeResultMessage

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

export interface LoadParseTreeMessage {
  type: 'parseTree'
  parseTree: ParseTreeInfo
}

export interface LoadParseTreesMessage {
  type: 'parse_trees'
  parseTrees: ParseTrees
}

export interface RequestExpressionTypeInfoMessage {
  type: 'request_expression_type_info'
  request: ExpressionTypeRequest
}

export type WorkerManagerMessage =
  | WorkerRunMessage
  | WorkerRerunMessage
  | LoadModuleMessage
  | LoadParseTreesMessage
  | TextContentRequestMessage
  | RequestExpressionTypeInfoMessage
