import { FileLoader } from '../language/projects/file_loader'
import { Project } from '../language/projects/project'
import { SerializedNode, deserializeNode } from '../language/type_registry'
import { SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { SplootFile } from '../language/projects/file'
import { SplootNode } from '../language/node'

export class FileSystemFileLoader implements FileLoader {
  directoryHandle: FileSystemDirectoryHandle

  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle
  }

  isReadOnly() {
    return true
  }

  async loadPackage(projectId: string, packageId: string): Promise<SplootPackage> {
    const packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId)
    const packStr = await (await (await packDirHandle.getFileHandle('package.sp')).getFile()).text()
    const pack = JSON.parse(packStr) as SerializedSplootPackage
    return new SplootPackage(projectId, pack, this)
  }

  async loadFile(projectId: string, packageId: string, filename: string): Promise<SplootNode> {
    const packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId)
    const fileStr = await (await (await packDirHandle.getFileHandle(filename + '.sp')).getFile()).text()
    const serNode = JSON.parse(fileStr) as SerializedNode
    const rootNode = deserializeNode(serNode)
    return rootNode
  }

  async saveProject(project: Project) {
    return ''
  }

  async saveFile(projectId: string, packageId: string, file: SplootFile) {
    return ''
  }

  async deleteProject(project: Project) {
    return false
  }
}
