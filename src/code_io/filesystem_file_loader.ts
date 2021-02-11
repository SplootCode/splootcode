import { SplootNode } from "../language/node";
import { SerializedSplootPackage, SplootPackage } from "../language/projects/package";
import { FileLoader } from "../language/projects/project";
import { SerializedNode, deserializeNode } from "../language/type_registry";


export class FileSystemFileLoader implements FileLoader {
  directoryHandle: FileSystemDirectoryHandle

  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle;
  }

  async loadPackage(projectId: string, packageId: string) : Promise<SplootPackage> {
    let packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId);
    let packStr = await (await (await packDirHandle.getFileHandle('package.spl')).getFile()).text();
    let pack = JSON.parse(packStr) as SerializedSplootPackage;
    return new SplootPackage(projectId, pack, this);
  }

  async loadFile(projectId: string, packageId: string, filename: string) : Promise<SplootNode> {
    let packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId);
    let fileStr = await (await (await packDirHandle.getFileHandle(filename + '.spl')).getFile()).text();
    let serNode = JSON.parse(fileStr) as SerializedNode;
    return deserializeNode(serNode);
  }
}