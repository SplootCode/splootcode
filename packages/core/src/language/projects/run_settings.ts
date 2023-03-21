import { HTTPScenario } from '../../http_types'

export enum RunType {
  COMMAND_LINE = 'COMMAND_LINE',
  HTTP_REQUEST = 'HTTP_REQUEST',
  SCHEDULE = 'SCHEDULE',
  STREAMLIT = 'STREAMLIT',
}

export interface RunSettings {
  runType: RunType

  httpScenarios: HTTPScenario[]
}
