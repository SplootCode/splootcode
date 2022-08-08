import { FileLoader } from './file_loader'
import { PackageBuildType, SerializedSplootPackage, SerializedSplootPackageRef, SplootPackage } from './package'

export interface SerializedProject {
  name: string
  layouttype: string
  title: string
  splootversion: string
  packages: SerializedSplootPackageRef[]
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
  packages: SplootPackage[]
  fileLoader: FileLoader

  constructor(owner: string, proj: SerializedProject, packages: SplootPackage[], fileLoader: FileLoader) {
    this.owner = owner
    this.name = proj.name
    this.isReadOnly = fileLoader.isReadOnly()
    this.title = proj.title
    this.fileLoader = fileLoader
    this.packages = packages
    switch (proj.layouttype) {
      case ProjectLayoutType.PYTHON_CLI:
        this.layoutType = ProjectLayoutType.PYTHON_CLI
        break
      default:
        this.layoutType = ProjectLayoutType.WEB
    }
  }

  async save(): Promise<boolean> {
    if (this.fileLoader.isReadOnly()) {
      return false
    }
    return await this.fileLoader.saveProject(this)
  }

  async delete(): Promise<boolean> {
    return await this.fileLoader.deleteProject(this)
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
    const pack = new SplootPackage(this.name, serialisedPackage, this.fileLoader)
    this.packages.push(pack)
    return pack
  }

  serialize(): string {
    const serProj: SerializedProject = {
      name: this.name,
      layouttype: this.layoutType,
      title: this.title,
      splootversion: this.splootversion,
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
