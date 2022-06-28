import { FileLoader } from '../language/projects/file_loader'
import { LocalStorageProjectLoader } from './local_storage_project_loader'
import { Project } from '../language/projects/project'
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

  async saveProject(project: Project) {
    const projKey = `project/${project.name}`
    window.localStorage.setItem(projKey, project.serialize())
    project.packages.forEach((splootPackage) => {
      const packageKey = `project/${project.name}/${splootPackage.name}`
      window.localStorage.setItem(packageKey, splootPackage.serialize())
      splootPackage.fileOrder.forEach((filename) => {
        this.saveFile(project.name, splootPackage.name, splootPackage.files[filename])
      })
    })
    this.projectLoader.updateProjectMetadata(project)
    return true
  }

  async saveFile(projectId: string, packageId: string, file: SplootFile) {
    const fileKey = `project/${projectId}/${packageId}/${file.name}`
    window.localStorage.setItem(fileKey, file.serialize())
    return true
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
