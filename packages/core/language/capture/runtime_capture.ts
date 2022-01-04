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

export interface IfStatementData {
  condition: StatementCapture[]
  trueblock?: StatementCapture[]
  elseblocks?: StatementCapture[]
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

export interface SingleStatementData {
  result: string
  resultType: string
}

export interface StatementCapture {
  type: string
  data?: PythonFileData | WhileLoopData | WhileLoopIteration | IfStatementData | SingleStatementData | ElseStatementData
  sideEffects?: SideEffect[]
  exceptionType?: string
  exceptionMessage?: string
}
