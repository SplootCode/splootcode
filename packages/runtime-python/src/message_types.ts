import {
  FileSpec,
  WorkerExpressionTypeResultMessage,
  WorkerModuleInfoMessage,
  WorkerRuntimeCaptureMessage,
  WorkerStderrMessage,
  WorkerStdoutMessage,
  WorkerTextConvertResultMessage,
  WorkerWebResponseMessage,
} from './runtime/common'

import { ExpressionTypeRequest, ParseTreeInfo, ParseTrees } from '@splootcode/language-python'
import { HTTPRequestAWSEvent, RunType } from '@splootcode/core'

export enum FrameState {
  DEAD = 0,
  REQUESTING_INITIAL_FILES,
  LIVE,
  UNMOUNTED,
}

export interface StdinMessage {
  type: 'stdin'
  stdin: string
}

/** Messages the editor sends to the iframe */
export interface WorkspaceFilesMessage {
  type: 'updatedfiles' | 'initialfiles'
  runType: RunType
  eventData: HTTPRequestAWSEvent | null
  data: {
    files: Map<string, FileSpec>
    envVars: Map<string, string>
  }
}

export interface ProxyTokenMessage {
  type: 'token'
  token: string
}

export interface GetModuleInfoMessage {
  type: 'module_info'
  moduleName: string
}

export interface SendParseTreeMessage {
  type: 'sendParseTree'
  parseTree: ParseTreeInfo
}

export interface SendParseTreesMessage {
  type: 'parse_trees'
  parseTrees: ParseTrees
}

export interface RequestExpressionTypeInfoMessage {
  type: 'request_expression_type_info'
  request: ExpressionTypeRequest
}

export type RuntimeMessage =
  | { type: 'heartbeat' | 'stop' | 'run' | 'export_text_code' }
  | SendParseTreesMessage
  | RequestExpressionTypeInfoMessage
  | StdinMessage
  | WorkspaceFilesMessage
  | ProxyTokenMessage
  | GetModuleInfoMessage

/** Messages to send to the Editor window */
export interface HeartbeatMessage {
  type: 'heartbeat'
  data: { state: FrameState }
}

export type EditorMessage =
  | { type: 'ready' | 'disabled' | 'running' | 'stdin' | 'refresh_token' }
  | HeartbeatMessage
  | WorkerRuntimeCaptureMessage
  | WorkerModuleInfoMessage
  | WorkerStdoutMessage
  | WorkerStderrMessage
  | WorkerWebResponseMessage
  | WorkerTextConvertResultMessage
  | WorkerExpressionTypeResultMessage
