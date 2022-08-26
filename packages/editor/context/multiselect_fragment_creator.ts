import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './tree_walker'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SplootNode } from '@splootcode/core/language/node'

export class MultiselectFragmentCreator extends RenderedTreeIterator {
  nodeStack: SplootNode[]
  fragmentNodes: SplootNode[]

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.nodeStack = []
    this.fragmentNodes = []
  }

  visitNodeDown(node: NodeBlock): void {
    console.log('Going down ', node.node.type)
    // TODO: Add a shallow clone of this node to the stack
    this.nodeStack.push(node.node.clone())
  }

  visitNodeUp(node: NodeBlock): void {
    // Repair the node (in case any childsets are missing required values)
    console.log('Going up ', node.node.type)
    this.nodeStack.pop()
    // If this is now the top of the stack, add it to the nodes list.
  }

  visitedRange(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Copy these children into the cloned node
    console.log('visiting childset ', listBlock.parentRef.childSetId)
  }

  getFragment(): SplootFragment {
    return new SplootFragment(this.fragmentNodes, this.start.listBlock.childSet.nodeCategory)
  }
}
