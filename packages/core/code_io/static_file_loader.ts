import { FileLoader, SaveError } from '../language/projects/file_loader'
import { SerializedNode, deserializeNode } from '../language/type_registry'
import { SerializedSplootPackage, SplootPackage } from '../language/projects/package'
import { SplootFile } from '../language/projects/file'
import { SplootNode } from '../language/node'

export class StaticFileLoader implements FileLoader {
  rootProjectUrl: string

  constructor(rootProjectUrl: string) {
    if (!rootProjectUrl.endsWith('/')) {
      rootProjectUrl += '/'
    }
    this.rootProjectUrl = rootProjectUrl
  }

  isReadOnly() {
    return true
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
    return rootNode
  }

  async saveFile(projectId: string, packageId: string, file: SplootFile): Promise<string> {
    throw new SaveError('Cannot save readonly file.')
  }
}
