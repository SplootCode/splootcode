import { InvariantViolationError, InvariantViolationType } from './invariants'
import { NodeCategory, isNodeInCategory } from './node_category_registry'
import { SerializedNode, deserializeNode } from './type_registry'
import { SplootNode } from './node'

export interface SerializedFragment {
  category: NodeCategory
  nodes: SerializedNode[]
}

export class SplootFragment {
  nodes: SplootNode[]
  nodeCategory: NodeCategory

  constructor(nodes: SplootNode[], nodeCategory: NodeCategory, trim = true) {
    this.nodeCategory = nodeCategory
    this.nodes = nodes
    if (trim) {
      this.trim()
    }
    this.nodes.forEach((node) => {
      if (!isNodeInCategory(node.type, this.nodeCategory)) {
        throw new InvariantViolationError(
          InvariantViolationType.FragmentNodeCategory,
          `${node.type} is not valid for fragment category ${this.nodeCategory}.`
        )
      }
    })
  }

  trim() {
    // Trim invisible nodes
    if (this.nodes.length === 1 && this.nodes[0].getNodeLayout().isInvisible()) {
      const node = this.nodes[0]
      if (node.childSetOrder.length === 1) {
        const childSet = node.getChildSet(node.childSetOrder[0])
        this.nodes = childSet.children
        this.nodeCategory = childSet.nodeCategory
      }
    }
  }

  isEmpty() {
    return this.nodes.length === 0
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
