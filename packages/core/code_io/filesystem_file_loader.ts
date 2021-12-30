import { FileLoader } from '@splootcode/core/language/projects/file_loader'
import { Project } from '@splootcode/core/language/projects/project'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SerializedSplootPackage, SplootPackage } from '@splootcode/core/language/projects/package'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootNode } from '@splootcode/core/language/node'
import { generateScope } from '@splootcode/core/language/scope/scope'

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
    generateScope(rootNode)
    rootNode.recursivelySetMutations(true)
    return rootNode
  }

  async saveProject(project: Project) {
    return false
  }

  async saveFile(projectId: string, packageId: string, file: SplootFile) {
    return false
  }

  async deleteProject(project: Project) {
    return false
  }
}
