import { NodeBlock } from 'layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './tree_walker'
import { SplootNode } from '@splootcode/core/language/node'

export class MultiselectTreeWalker extends RenderedTreeIterator {
  nodeStack: SplootNode[]
  nodes: SplootNode[]

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
  }

  visitNodeDown(node: NodeBlock): void {
    
    this.nodeStack.push(node.node)
  }

  visitNodeUp(node: NodeBlock): void {
    this.nodeStack.pop()
  }

  visitedRange(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {

  }

  getSelectedListBlocks(): Set<RenderedChildSetBlock> {
    return this.selectedListBlocks
  }
}
