import { NodeCategory } from './node_category_registry'
import { SerializedNode, deserializeNode } from './type_registry'
import { SplootNode } from './node'

interface SerializedFragment {
  category: NodeCategory
  nodes: SerializedNode[]
}

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

  serialize(): SerializedFragment {
    return {
      category: this.nodeCategory,
      nodes: this.nodes.map((node) => node.serialize()),
    }
  }
}

export function deserializeFragment(serFragment: SerializedFragment): SplootFragment {
  const nodes = serFragment.nodes.map((serNode) => deserializeNode(serNode))
  return new SplootFragment(nodes, serFragment.category)
}
