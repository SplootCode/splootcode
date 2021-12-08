import { SplootNode } from "@splootcode/core/language/node";
import { SerializedSplootPackage, SplootPackage } from "@splootcode/core/language/projects/package";
import { FileLoader } from "@splootcode/core/language/projects/project";
import { generateScope } from "@splootcode/core/language/scope/scope";
import { deserializeNode, SerializedNode } from "@splootcode/core/language/type_registry";


export class StaticFileLoader implements FileLoader {
  rootProjectUrl: string;
  
  constructor(rootProjectUrl: string) {
    if (!rootProjectUrl.endsWith('/')) {
      rootProjectUrl += '/';
    }
    this.rootProjectUrl = rootProjectUrl;
  }
  
  async loadPackage(projectId: string, packageId: string) : Promise<SplootPackage> {
    let packStr = await (await fetch(this.rootProjectUrl + packageId + '/package.sp')).text()
    let pack = JSON.parse(packStr) as SerializedSplootPackage;
    return new SplootPackage(projectId, pack, this);
  }
  
  async loadFile(projectId: string, packageId: string, filename: string) : Promise<SplootNode> {
    let fileStr = await (await fetch(this.rootProjectUrl + packageId + '/' + filename + '.sp')).text()
    let serNode = JSON.parse(fileStr) as SerializedNode;
    let rootNode = deserializeNode(serNode);
    generateScope(rootNode);
    rootNode.recursivelySetMutations(true);
    return rootNode;
  }
}