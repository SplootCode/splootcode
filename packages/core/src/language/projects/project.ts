import { FileLoader } from './file_loader'
import { PackageBuildType, SerializedSplootPackage, SerializedSplootPackageRef, SplootPackage } from './package'
import { ProjectMutationType } from '../mutations/project_mutations'
import { RunSettings, RunType } from './run_settings'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'

export interface SerializedProject {
  name: string
  layouttype: string
  runSettings: RunSettings
  title: string
  splootversion: string
  version: string
  packages: SerializedSplootPackageRef[]
  environmentVars?: { [key: string]: [string, boolean] }
}

export enum ProjectLayoutType {
  WEB = 'WEB',
  PYTHON_CLI = 'PYTHON_CLI',
}

export class Project {
  owner: string
  name: string
  isReadOnly: boolean
  layoutType: ProjectLayoutType
  runSettings: RunSettings
  title: string
  splootversion: string
  version: string
  packages: SplootPackage[]
  fileLoader: FileLoader
  environmentVars: Map<string, [string, boolean]>
  environmentVarsChanged: boolean

  constructor(owner: string, proj: SerializedProject, packages: SplootPackage[], fileLoader: FileLoader) {
    this.owner = owner
    this.name = proj.name
    this.isReadOnly = fileLoader.isReadOnly()
    this.title = proj.title
    this.version = proj.version
    this.runSettings = proj.runSettings || { runType: RunType.COMMAND_LINE }
    this.fileLoader = fileLoader
    this.packages = packages
    this.environmentVars = new Map(Object.entries(proj.environmentVars || {}))
    this.environmentVarsChanged = false
    switch (proj.layouttype) {
      case ProjectLayoutType.PYTHON_CLI:
        this.layoutType = ProjectLayoutType.PYTHON_CLI
        break
      default:
        this.layoutType = ProjectLayoutType.WEB
    }
  }

  getDefaultPackage(): SplootPackage {
    return this.packages[0]
  }

  setRunSettings(newSettings: RunSettings) {
    this.runSettings = newSettings
    globalMutationDispatcher.handleProjectMutation({
      type: ProjectMutationType.UPDATE_RUN_SETTINGS,
      newSettings: newSettings,
    })
  }

  addNewPackage(name: string, buildType: PackageBuildType): SplootPackage {
    const serialisedPackage: SerializedSplootPackage = {
      name: name,
      buildType: buildType,
      files: [],
    }
    const pack = new SplootPackage(this.owner, this.name, serialisedPackage)
    this.packages.push(pack)
    return pack
  }

  deleteEnvironmentVar(key: string) {
    this.environmentVars.delete(key)
    this.environmentVarsChanged = true
    globalMutationDispatcher.handleProjectMutation({
      type: ProjectMutationType.DELETE_ENVIRONMENT_VAR,
      name: key,
    })
  }

  setEnvironmentVar(key: string, value: string, secret: boolean) {
    this.environmentVars.set(key, [value, secret])
    this.environmentVarsChanged = true
    globalMutationDispatcher.handleProjectMutation({
      type: ProjectMutationType.SET_ENVIRONMENT_VAR,
      newName: key,
      newValue: value,
      secret,
    })
  }

  clearChangedState() {
    this.environmentVarsChanged = false
  }

  serialize(includeSecrets = false): string {
    let environmentVars = this.environmentVars
    if (!includeSecrets) {
      environmentVars = new Map(
        [...this.environmentVars.entries()].map(([key, [value, secret]]) => {
          if (secret) {
            return [key, ['', secret]]
          }
          return [key, [value, secret]]
        })
      )
    }

    const serProj: SerializedProject = {
      name: this.name,
      layouttype: this.layoutType,
      runSettings: this.runSettings,
      title: this.title,
      splootversion: this.splootversion,
      version: this.version,
      environmentVars: Object.fromEntries(environmentVars),
      packages: this.packages.map((pack) => {
        const packRef: SerializedSplootPackageRef = {
          name: pack.name,
          buildType: pack.buildType,
        }
        return packRef
      }),
    }
    return JSON.stringify(serProj, null, 2) + '\n'
  }
}
