import { SplootNode } from "@splootcode/core/language/node";
import { SerializedSplootPackage, SplootPackage } from "@splootcode/core/language/projects/package";
import { FileLoader } from "@splootcode/core/language/projects/project";
import { generateScope } from "@splootcode/core/language/scope/scope";
import { SerializedNode, deserializeNode } from "@splootcode/core/language/type_registry";


export class FileSystemFileLoader implements FileLoader {
  directoryHandle: FileSystemDirectoryHandle

  constructor(directoryHandle: FileSystemDirectoryHandle) {
    this.directoryHandle = directoryHandle;
  }

  async loadPackage(projectId: string, packageId: string) : Promise<SplootPackage> {
    let packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId);
    let packStr = await (await (await packDirHandle.getFileHandle('package.sp')).getFile()).text();
    let pack = JSON.parse(packStr) as SerializedSplootPackage;
    return new SplootPackage(projectId, pack, this);
  }

  async loadFile(projectId: string, packageId: string, filename: string) : Promise<SplootNode> {
    let packDirHandle = await this.directoryHandle.getDirectoryHandle(packageId);
    let fileStr = await (await (await packDirHandle.getFileHandle(filename + '.sp')).getFile()).text();
    let serNode = JSON.parse(fileStr) as SerializedNode;
    let rootNode = deserializeNode(serNode);
    generateScope(rootNode);
    rootNode.recursivelySetMutations(true);
    return rootNode;
  }
} 