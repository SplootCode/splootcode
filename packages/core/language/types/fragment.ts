import { NodeCategory } from '../node_category_registry'
import { SplootNode } from '../node'

export class SplootFragment {
  nodes: SplootNode[]
  nodeCategory?: NodeCategory

  constructor(nodes: SplootNode[], nodeCategory?: NodeCategory) {
    this.nodeCategory = nodeCategory
    if (nodes.length == 0) {
      throw Error('Cannot have empty sploot node fragment.')
    }
    this.nodes = nodes
  }

  clone(): SplootFragment {
    return new SplootFragment(
      this.nodes.map((node) => node.clone()),
      this.nodeCategory
    )
  }

  isSingle() {
    return this.nodes.length == 1
  }
}
