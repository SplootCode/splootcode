export enum RunType {
  COMMAND_LINE = 'COMMAND_LINE',
  HANDLER_FUNCTION = 'HANDLER_FUNCTION',
  HTTP_REQUEST = 'HTTP_REQUEST',
}

export interface RunSettings {
  runType: RunType
  handlerFunction?: string
}
