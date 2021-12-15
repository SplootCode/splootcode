import { SplootNode } from '../node'
import { SerializedSplootFileRef, SplootFile } from './file'
import { FileLoader } from './project'

export interface SerializedSplootPackageRef {
  name: string
  buildType: string
}

export interface SerializedSplootPackage {
  name: string
  files: SerializedSplootFileRef[]
  buildType: string
  entryPoints: string[]
}

enum PackageType {
  STATIC = 0,
  JS_BUNDLE,
  STYLE_BUNDLE,
}

export class SplootPackage {
  projectId: string
  name: string
  files: { [key: string]: SplootFile }
  fileOrder: string[]
  buildType: PackageType
  fileLoader: FileLoader
  entryPoints: string[]

  constructor(projectId: string, pack: SerializedSplootPackage, fileLoader: FileLoader) {
    this.projectId = projectId
    this.name = pack.name
    this.fileLoader = fileLoader
    this.buildType = PackageType[pack.buildType]
    this.fileOrder = pack.files.map((file) => file.name)
    this.files = {}
    pack.files.forEach((file) => {
      this.files[file.name] = new SplootFile(file.name, file.type)
    })
  }

  serialize(): string {
    const ser: SerializedSplootPackage = {
      name: this.name,
      buildType: PackageType[this.buildType],
      entryPoints: this.entryPoints,
      files: [],
    }
    this.fileOrder.forEach((filename) => {
      ser.files.push(this.files[filename].getSerializedRef())
    })
    return JSON.stringify(ser, null, 2) + '\n'
  }

  getDefaultFile(): SplootFile {
    return this.files[this.fileOrder[0]]
  }

  async addFile(name: string, type: string, rootNode: SplootNode) {
    const splootFile = new SplootFile(name, type)
    splootFile.fileLoaded(rootNode)
    this.files[name] = splootFile
    this.fileOrder.push(name)
  }

  async getLoadedFile(name: string): Promise<SplootFile> {
    const file = this.files[name]
    if (!file.isLoaded) {
      return await this.fileLoader.loadFile(this.projectId, this.name, name).then((rootNode: SplootNode) => {
        file.fileLoaded(rootNode)
        return file
      })
    }
    return file
  }
}
