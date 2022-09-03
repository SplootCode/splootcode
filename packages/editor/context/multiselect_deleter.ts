import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SplootNode } from '@splootcode/core/language/node'

export class MultiselectDeleter extends RenderedTreeIterator {
  nodeStack: boolean[]
  toFullyDelete: SplootNode[]
  toKeep: SplootFragment[]

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.nodeStack = []
    this.toFullyDelete = []
    this.toKeep = []
  }

  visitNodeDown(node: NodeBlock): void {
    // Only stack nodes at the top level that can be deleted
    if (this.nodeStack.length !== 0 || node.parentChildSet.allowDelete()) {
      this.nodeStack.push(true)
    }
  }

  visitNodeUp(node: NodeBlock): void {
    if (this.nodeStack.length !== 0) {
      this.nodeStack.pop()
      if (this.nodeStack.length === 0) {
        this.toFullyDelete.push(node.node)
      }
    }
  }

  visitedRange(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Add leftovers to return set
    if (endIndex < listBlock.nodes.length && this.nodeStack.length !== 0) {
      const nodes = listBlock.childSet.children
        .slice(endIndex)
        .filter((node) => !node.isEmpty())
        .map((node) => node.clone())
      if (nodes.length > 0) {
        const fragment = new SplootFragment(nodes, listBlock.childSet.nodeCategory)
        this.toKeep.push(fragment)
      }
    }
  }

  perfromDelete(): SplootFragment[] {
    this.toFullyDelete.forEach((node) => {
      const parent = node.parent.node
      const parentChildSet = node.parent.getChildSet()
      const index = parentChildSet.getIndexOf(node)
      if (parentChildSet.allowDelete()) {
        parentChildSet.removeChild(index)
        parent.clean()
      }
    })
    return this.toKeep
  }
}
