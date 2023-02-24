import { ChildSetType, SplootFragment } from '@splootcode/core'
import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'

export interface DeleteSet {
  node: NodeBlock
  keep: SplootFragment[]
}

export class MultiselectDeleter extends RenderedTreeIterator {
  childSetStack: boolean[]
  toFullyDelete: DeleteSet[]
  toKeep: SplootFragment[]

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.childSetStack = []
    this.toFullyDelete = []
    this.toKeep = []
  }

  visitNodeMiddle(node: NodeBlock): void {
    if (this.childSetStack.length <= 1 && node.parentChildSet.childSet.type !== ChildSetType.Immutable) {
      this.toFullyDelete.push({ node: node, keep: [] })
    }
  }

  startRangeRight(listBlock: RenderedChildSetBlock): void {
    if (listBlock.childSet.type !== ChildSetType.Immutable) {
      this.childSetStack.push(true)
    }
  }

  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    if (listBlock.childSet.type !== ChildSetType.Immutable) {
      this.childSetStack.pop()
    }
    // Add leftovers to return set
    if (endIndex < listBlock.nodes.length && this.childSetStack.length !== 0) {
      const nodes = listBlock.childSet.children
        .slice(endIndex)
        .filter((node) => !node.isEmpty())
        .map((node) => node.clone())

      if (nodes.length > 0) {
        const fragment = new SplootFragment(nodes, listBlock.childSet.nodeCategory)
        this.toFullyDelete[this.toFullyDelete.length - 1].keep.push(fragment)
      }
    }
  }

  getDeletions(): DeleteSet[] {
    return this.toFullyDelete
  }
}
