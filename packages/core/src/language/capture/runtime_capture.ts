export interface SideEffect {
  type: string
  value: string
}

export interface WhileLoopData {
  frames?: StatementCapture[]
}

export interface WhileLoopIteration {
  condition: StatementCapture[]
  block?: StatementCapture[]
}

export interface ForLoopData {
  frames?: StatementCapture[]
}

export interface ForLoopIteration {
  iterable: StatementCapture[]
  block?: StatementCapture[]
}

export interface IfStatementData {
  condition: StatementCapture[]
  trueblock?: StatementCapture[]
  elseblocks?: StatementCapture[]
}

export interface ImportStatementData {
  import: StatementCapture[]
}

export interface ElseIfStatementData {
  condition: StatementCapture[]
  block: StatementCapture[]
}

export interface ElseStatementData {
  block: StatementCapture[]
}

export interface PythonFileData {
  body?: StatementCapture[]
}

export interface FunctionDeclarationData {
  calls: StatementCapture[]
}

export interface FunctionCallData {
  body: StatementCapture[]
}

export interface SingleStatementData {
  result: string
  resultType: string
}

export interface StatementCapture {
  type: string
  data?:
    | PythonFileData
    | WhileLoopData
    | WhileLoopIteration
    | IfStatementData
    | SingleStatementData
    | ElseStatementData
    | ImportStatementData
    | FunctionDeclarationData
    | FunctionCallData
  sideEffects?: SideEffect[]
  exceptionType?: string
  exceptionMessage?: string
}

export interface CapturePayload {
  root: StatementCapture
  detached: { [key: string]: StatementCapture[] }
}
