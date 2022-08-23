import { FileLoader, SaveError } from '../language/projects/file_loader'
import { LocalStorageProjectLoader } from './local_storage_project_loader'
import { Project, SerializedProject } from '../language/projects/project'
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

  getStoredProjectVersion(projectID: string): string {
    const projKey = `project/${projectID}`
    const projStr = window.localStorage.getItem(projKey)
    const proj = JSON.parse(projStr) as SerializedProject
    return proj.version
  }

  async saveProject(project: Project, base_version: string | null): Promise<string> {
    // Check local storage if it's got the same base version
    let version
    if (base_version) {
      const currentSaveVersion = this.getStoredProjectVersion(project.name)
      if (currentSaveVersion !== base_version) {
        throw new SaveError('This project has been edited in another window.')
      }
      version = base_version
    } else {
      version = (Math.random() + 1).toString(36)
    }

    for (const splootPackage of project.packages) {
      const packageKey = `project/${project.name}/${splootPackage.name}`
      window.localStorage.setItem(packageKey, splootPackage.serialize())
      for (const filename of splootPackage.fileOrder) {
        version = await this.saveFile(project.name, splootPackage.name, splootPackage.files[filename], version)
      }
    }
    project.version = version
    const projKey = `project/${project.name}`
    window.localStorage.setItem(projKey, project.serialize())
    return version
  }

  async saveFile(projectID: string, packageID: string, file: SplootFile, base_version: string): Promise<string> {
    const fileKey = `project/${projectID}/${packageID}/${file.name}`
    window.localStorage.setItem(fileKey, file.serialize())
    // Randomly generate new version
    const newVersion = (Math.random() + 1).toString(36)
    return newVersion
  }

  async deleteProject(project: Project): Promise<boolean> {
    project.packages.forEach((splootPackage) => {
      splootPackage.fileOrder.forEach((filename) => {
        const fileKey = `project/${project.name}/${splootPackage.name}/${filename}`
        window.localStorage.removeItem(fileKey)
      })
      const packageKey = `project/${project.name}/${splootPackage.name}`
      window.localStorage.removeItem(packageKey)
    })
    const projKey = `project/${project.name}`
    window.localStorage.removeItem(projKey)
    return true
  }
}
