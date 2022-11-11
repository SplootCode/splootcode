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

  getProjKey(ownerId: string, projectId: string) {
    if (ownerId === 'local') {
      return `project/${projectId}`
    }
    return `project/${ownerId}/${projectId}`
  }

  async loadPackage(ownerID: string, projectID: string, packageID: string): Promise<SplootPackage> {
    const packageKey = `${this.getProjKey(ownerID, projectID)}/${packageID}`
    const packStr = window.localStorage.getItem(packageKey)
    const pack = JSON.parse(packStr) as SerializedSplootPackage
    return new SplootPackage(ownerID, projectID, pack)
  }

  async loadFile(ownerID: string, projectID: string, packageID: string, filename: string): Promise<SplootNode> {
    const fileKey = `${this.getProjKey(ownerID, projectID)}/${packageID}/${filename}`
    const fileStr = window.localStorage.getItem(fileKey)
    const serNode = JSON.parse(fileStr) as SerializedNode
    const rootNode = deserializeNode(serNode)
    return rootNode
  }

  async saveFile(
    ownerID: string,
    projectID: string,
    packageID: string,
    file: SplootFile,
    base_version: string
  ): Promise<string> {
    const fileKey = `${this.getProjKey(ownerID, projectID)}/${packageID}/${file.name}`
    window.localStorage.setItem(fileKey, file.serialize())
    // Randomly generate new version
    const newVersion = (Math.random() + 1).toString(36)
    return newVersion
  }
}
