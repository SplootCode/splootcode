import { EditorMessage } from '../message_types'
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

export type WorkerMessage =
  | { type: 'ready' | 'stdin' | 'finished' | 'continueFetch' }
  | WorkerStdoutMessage
  | WorkerStderrMessage
  | WorkerInputValueMessage
  | WorkerFetchMessage
  | WorkerRuntimeCaptureMessage
  | WorkerModuleInfoMessage
  | WorkerWebResponseMessage

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

export type WorkerManagerMessage = WorkerRunMessage | WorkerRerunMessage | LoadModuleMessage
