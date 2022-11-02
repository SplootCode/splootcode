import { NodeBlock } from '../layout/rendered_node'

export class EditBoxData {
  x: number
  y: number
  property: string
  contents: string
  node: NodeBlock

  constructor(nodeBlock: NodeBlock, property: string, coordindates: number[]) {
    this.node = nodeBlock
    this.property = property
    this.contents = this.node.node.getProperty(property)
    this.x = coordindates[0]
    this.y = coordindates[1]
  }
}
