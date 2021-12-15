import { SplootNode } from '@splootcode/core/language/node'
import { SerializedSplootPackage, SplootPackage } from '@splootcode/core/language/projects/package'
import { FileLoader } from '@splootcode/core/language/projects/project'
import { generateScope } from '@splootcode/core/language/scope/scope'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'

export class FileSystemFileLoader implements FileLoader {
  directoryHandle: FileSystemDirectoryHandle

  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle
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
}
