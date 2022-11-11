import { FileLoader } from './file_loader'
import { SerializedSplootFileRef, SplootFile } from './file'
import { SplootNode } from '../node'

export interface SerializedSplootPackageRef {
  name: string
  buildType: number
}

export interface SerializedSplootPackage {
  name: string
  files: SerializedSplootFileRef[]
  buildType: number
}

export enum PackageBuildType {
  STATIC = 0,
  JS_BUNDLE = 1,
  STYLE_BUNDLE = 2,
  PYTHON = 4,
}

export class SplootPackage {
  ownerID: string
  projectId: string
  name: string
  files: { [key: string]: SplootFile }
  fileOrder: string[]
  buildType: PackageBuildType

  constructor(ownerID: string, projectId: string, pack: SerializedSplootPackage) {
    this.ownerID = ownerID
    this.projectId = projectId
    this.name = pack.name
    this.buildType = pack.buildType
    this.fileOrder = pack.files.map((file) => file.name)
    this.files = {}
    pack.files.forEach((file) => {
      this.files[file.name] = new SplootFile(file.name, file.type)
    })
  }

  serialize(): string {
    const ser: SerializedSplootPackage = {
      name: this.name,
      buildType: this.buildType,
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
    if (!this.fileOrder.includes(name)) {
      this.fileOrder.push(name)
    }
  }

  async getLoadedFile(fileLoader: FileLoader, name: string): Promise<SplootFile> {
    const file = this.files[name]
    if (!file.isLoaded) {
      return await fileLoader.loadFile(this.ownerID, this.projectId, this.name, name).then((rootNode: SplootNode) => {
        file.fileLoaded(rootNode)
        return file
      })
    }
    return file
  }
}
