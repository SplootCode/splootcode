import { HTTPRequestEvent } from '../../http_types'

export enum RunType {
  // deprecated
  HANDLER_FUNCTION = 'HANDLER_FUNCTION',

  COMMAND_LINE = 'COMMAND_LINE',
  HTTP_REQUEST = 'HTTP_REQUEST',
  SCHEDULE = 'SCHEDULE',
}

export interface RunSettings {
  runType: RunType

  httpScenarios?: HTTPRequestEvent[]
}
