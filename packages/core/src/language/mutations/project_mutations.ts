import { RunSettings } from '../projects/run_settings'

export enum ProjectMutationType {
  SET_ENVIRONMENT_VAR,
  DELETE_ENVIRONMENT_VAR,
  UPDATE_RUN_SETTINGS,
}

export type ProjectMutation =
  | ProjectUpdateEnvVarMutation
  | ProjectDeleteEnvVarMutation
  | ProjectUpdateRunSettingsMutation

export class ProjectUpdateEnvVarMutation {
  type: ProjectMutationType.SET_ENVIRONMENT_VAR
  newName: string
  newValue: string
  secret: boolean
}

export class ProjectDeleteEnvVarMutation {
  type: ProjectMutationType.DELETE_ENVIRONMENT_VAR
  name: string
}

export class ProjectUpdateRunSettingsMutation {
  type: ProjectMutationType.UPDATE_RUN_SETTINGS
  newSettings: RunSettings
}
