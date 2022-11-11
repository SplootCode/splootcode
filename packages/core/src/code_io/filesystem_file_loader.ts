import { FileLoader, SaveError } from '../language/projects/file_loader'
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

  async loadPackage(ownerID: string, projectId: string, packageId: string): Promise<SplootPackage> {
    const packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId)
    const packStr = await (await (await packDirHandle.getFileHandle('package.sp')).getFile()).text()
    const pack = JSON.parse(packStr) as SerializedSplootPackage
    return new SplootPackage(ownerID, projectId, pack)
  }

  async loadFile(ownerID: string, projectId: string, packageId: string, filename: string): Promise<SplootNode> {
    const packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId)
    const fileStr = await (await (await packDirHandle.getFileHandle(filename + '.sp')).getFile()).text()
    const serNode = JSON.parse(fileStr) as SerializedNode
    const rootNode = deserializeNode(serNode)
    return rootNode
  }

  async saveFile(ownerID: string, projectId: string, packageId: string, file: SplootFile): Promise<string> {
    throw new SaveError('Cannot save readonly file.')
  }
}
