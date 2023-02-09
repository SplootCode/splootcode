export enum ProjectMutationType {
  SET_ENVIRONMENT_VAR,
  DELETE_ENVIRONMENT_VAR,
}

export type ProjectMutation = ProjectUpdateEnvVarMutation | ProjectDeleteEnvVarMutation

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
