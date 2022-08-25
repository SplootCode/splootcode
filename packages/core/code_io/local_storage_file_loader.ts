import { FileLoader } from '../language/projects/file_loader'
import { LocalStorageProjectLoader } from './local_storage_project_loader'
import { SerializedNode, deserializeNode } from '../language/type_registry'
import { SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { SplootFile } from '../language/projects/file'
import { SplootNode } from '../language/node'

export class LocalStorageFileLoader implements FileLoader {
  projectLoader: LocalStorageProjectLoader

  constructor(projectLoader: LocalStorageProjectLoader) {
    this.projectLoader = projectLoader
  }

  isReadOnly() {
    return false
  }

  async loadPackage(projectId: string, packageId: string): Promise<SplootPackage> {
    const packageKey = `project/${projectId}/${packageId}`
    const packStr = window.localStorage.getItem(packageKey)
    const pack = JSON.parse(packStr) as SerializedSplootPackage
    return new SplootPackage(projectId, pack, this)
  }

  async loadFile(projectId: string, packageId: string, filename: string): Promise<SplootNode> {
    const fileKey = `project/${projectId}/${packageId}/${filename}`
    const fileStr = window.localStorage.getItem(fileKey)
    const serNode = JSON.parse(fileStr) as SerializedNode
    const rootNode = deserializeNode(serNode)
    return rootNode
  }

  async saveFile(projectID: string, packageID: string, file: SplootFile, base_version: string): Promise<string> {
    const fileKey = `project/${projectID}/${packageID}/${file.name}`
    window.localStorage.setItem(fileKey, file.serialize())
    // Randomly generate new version
    const newVersion = (Math.random() + 1).toString(36)
    return newVersion
  }
}
