import { FileLoader } from './file_loader'
import { PackageBuildType, SerializedSplootPackage, SerializedSplootPackageRef, SplootPackage } from './package'
import { ProjectMutationType } from '../mutations/project_mutations'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'

export interface SerializedProject {
  name: string
  layouttype: string
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
  title: string
  splootversion: string
  version: string
  packages: SplootPackage[]
  fileLoader: FileLoader
  envrionmentVars: Map<string, [string, boolean]>

  constructor(owner: string, proj: SerializedProject, packages: SplootPackage[], fileLoader: FileLoader) {
    this.owner = owner
    this.name = proj.name
    this.isReadOnly = fileLoader.isReadOnly()
    this.title = proj.title
    this.version = proj.version
    this.fileLoader = fileLoader
    this.packages = packages
    this.envrionmentVars = new Map(Object.entries(proj.environmentVars || {}))
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
    this.envrionmentVars.delete(key)
    globalMutationDispatcher.handleProjectMutation({
      type: ProjectMutationType.DELETE_ENVIRONMENT_VAR,
      name: key,
    })
  }

  setEnvironmentVar(key: string, value: string, secret: boolean) {
    this.envrionmentVars.set(key, [value, secret])
    globalMutationDispatcher.handleProjectMutation({
      type: ProjectMutationType.SET_ENVIRONMENT_VAR,
      newName: key,
      newValue: value,
      secret,
    })
  }

  serialize(): string {
    const serProj: SerializedProject = {
      name: this.name,
      layouttype: this.layoutType,
      title: this.title,
      splootversion: this.splootversion,
      version: this.version,
      environmentVars: Object.fromEntries(this.envrionmentVars),
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
