import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory, SerializedNode, SplootFragment, combineFragments, deserializeNode } from '@splootcode/core'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'

export class MultiselectFragmentCreator extends RenderedTreeIterator {
  leftChildSetStack: SerializedNode[][]
  childSetStack: SerializedNode[][]
  fragment: SplootFragment

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.leftChildSetStack = []
    this.childSetStack = []
    this.fragment = null
  }

  startRangeLeft(): void {
    this.childSetStack.push([])
  }

  startRangeRight(): void {
    this.childSetStack.push([])
  }

  visitNodeMiddle(node: NodeBlock): void {
    // Add a shallow clone of this node to the stack
    const thisNode: SerializedNode = node.node.shallowSerialize()

    if (node.leftBreadcrumbChildSet) {
      // Resolve the left children, now that we know this node is included.
      const leftChildSetStack = this.leftChildSetStack.pop()
      thisNode.childSets[node.leftBreadcrumbChildSet] = leftChildSetStack
    }
    if (node.beforeStackChildSet) {
      // Resolve the before stack, now that we know this node is included.
      const leftChildSetStack = this.leftChildSetStack.pop()
      thisNode.childSets[node.beforeStackChildSet] = leftChildSetStack
    }

    if (this.childSetStack.length !== 0) {
      const curChildSetStack = this.childSetStack[this.childSetStack.length - 1]
      curChildSetStack.push(thisNode)
    }
  }

  visitNodeUp(node: NodeBlock): void {
    if (this.leftChildSetStack.length > 0) {
      const leftovers = this.leftChildSetStack.pop()
      const currentChildSet = this.childSetStack[this.childSetStack.length - 1]
      currentChildSet.push(...leftovers)
    }
  }

  visitedRangeLeft(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Do nothing for the left, let them accumulate in the childset stack.
    // Move the childset Stack into the left childset stack?
    const children = this.childSetStack.pop()
    this.leftChildSetStack.push(children)
  }

  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Copy these children into the current shallow-cloned node
    const children = this.childSetStack.pop()
    const currentChildSet = this.childSetStack[this.childSetStack.length - 1]
    if (currentChildSet && currentChildSet.length !== 0) {
      const currentNode = currentChildSet[currentChildSet.length - 1]
      currentNode.childSets[listBlock.parentRef.childSetId] = children
    } else {
      // This whole childset doesn't have a parent to attach to.
      const nodes = children.map((serNode) => deserializeNode(serNode))
      const fragment = new SplootFragment(nodes, listBlock.childSet.nodeCategory, false /* don't trim */)
      this.fragment = combineFragments(this.fragment, fragment)
    }
  }

  getFragment(): SplootFragment {
    if (this.leftChildSetStack.length !== 0) {
      const leftChildren = this.leftChildSetStack.pop()
      const nodes = leftChildren.map((serNode) => deserializeNode(serNode))
      // Currently left children are always python expression tokens
      const fragment = new SplootFragment(nodes, NodeCategory.PythonExpressionToken, false /* don't trim */)
      this.fragment = combineFragments(this.fragment, fragment)
    }
    if (this.fragment) {
      this.fragment.trim()
      return this.fragment
    }
    return null
  }
}
