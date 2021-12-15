import { FileLoader } from '@splootcode/core/language/projects/project'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SerializedSplootPackage, SplootPackage } from '@splootcode/core/language/projects/package'
import { SplootNode } from '@splootcode/core/language/node'
import { generateScope } from '@splootcode/core/language/scope/scope'

export class StaticFileLoader implements FileLoader {
  rootProjectUrl: string

  constructor(rootProjectUrl: string) {
    if (!rootProjectUrl.endsWith('/')) {
      rootProjectUrl += '/'
    }
    this.rootProjectUrl = rootProjectUrl
  }

  async loadPackage(projectId: string, packageId: string): Promise<SplootPackage> {
    const packStr = await (await fetch(this.rootProjectUrl + packageId + '/package.sp')).text()
    const pack = JSON.parse(packStr) as SerializedSplootPackage
    return new SplootPackage(projectId, pack, this)
  }

  async loadFile(projectId: string, packageId: string, filename: string): Promise<SplootNode> {
    const fileStr = await (await fetch(this.rootProjectUrl + packageId + '/' + filename + '.sp')).text()
    const serNode = JSON.parse(fileStr) as SerializedNode
    const rootNode = deserializeNode(serNode)
    generateScope(rootNode)
    rootNode.recursivelySetMutations(true)
    return rootNode
  }
}
