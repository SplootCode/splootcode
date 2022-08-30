import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SplootNode } from '@splootcode/core/language/node'

export class MultiselectFragmentCreator extends RenderedTreeIterator {
  nodeStack: SerializedNode[]
  childSetStack: SerializedNode[][]
  fragmentNodes: SplootNode[]

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.nodeStack = []
    this.fragmentNodes = []
    this.childSetStack = []
  }

  visitNodeDown(node: NodeBlock): void {
    // Add a shallow clone of this node to the stack
    const serNode: SerializedNode = node.node.shallowSerialize()
    if (this.childSetStack.length !== 0) {
      const curChildSetStack = this.childSetStack[this.childSetStack.length - 1]
      curChildSetStack.push(serNode)
    }
    this.nodeStack.push(serNode)
    this.childSetStack.push([])
  }

  visitNodeUp(node: NodeBlock): void {
    const serNode = this.nodeStack.pop()
    this.childSetStack.pop()
    // If this is a top-level node, add it to the fragment
    if (this.nodeStack.length === 0) {
      // Deserializing also repairs any missing/broken childsets
      this.fragmentNodes.push(deserializeNode(serNode))
    }
  }

  visitedRange(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Copy these children into the current shallow-cloned node
    const children = this.childSetStack.pop()
    if (this.nodeStack.length !== 0) {
      const currentNode = this.nodeStack[this.nodeStack.length - 1]
      currentNode.childSets[listBlock.parentRef.childSetId] = children
    }
    // Prep for next childset
    this.childSetStack.push([])
  }

  getFragment(): SplootFragment {
    return new SplootFragment(this.fragmentNodes, this.start.listBlock.childSet.nodeCategory)
  }
}
