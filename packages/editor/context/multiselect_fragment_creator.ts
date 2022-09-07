import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SplootNode } from '@splootcode/core/language/node'
import { combineFragments } from '@splootcode/core/language/fragment_adapter'

export class MultiselectFragmentCreator extends RenderedTreeIterator {
  downNodeStack: SerializedNode[]
  childSetStack: SerializedNode[][]
  leftChildSetStack: SerializedNode[][]
  leftListBlockStack: RenderedChildSetBlock[]
  fragmentNodes: SplootNode[]
  fragment: SplootFragment

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.downNodeStack = []
    this.fragmentNodes = []
    this.childSetStack = []
    this.fragment = null
    this.leftChildSetStack = []
    this.leftListBlockStack = []
  }

  visitNodeDown(node: NodeBlock): void {
    // Add a shallow clone of this node to the stack
    const serNode: SerializedNode = node.node.shallowSerialize()
    if (this.childSetStack.length !== 0) {
      const curChildSetStack = this.childSetStack[this.childSetStack.length - 1]
      curChildSetStack.push(serNode)
    }
    this.downNodeStack.push(serNode)
    this.childSetStack.push([])
    this.leftChildSetStack.push([])
    this.leftListBlockStack.push(null)
  }

  visitNodeMiddle(node: NodeBlock): void {
    // Resolve the left children, now that we know this node is included.
    const leftChildSetStack = this.leftChildSetStack.pop()
    const leftListBlock = this.leftListBlockStack.pop()
    if (leftListBlock !== null) {
      const currentNode = this.downNodeStack[this.downNodeStack.length - 1]
      currentNode.childSets[leftListBlock.parentRef.childSetId] = leftChildSetStack
    }
  }

  visitNodeUp(node: NodeBlock): void {
    const serNode = this.downNodeStack.pop()
    this.childSetStack.pop()

    // If there are leftover left-side chidren, they must be separate fragments.
    // It means the parent node was never reached by `visitNodeMiddle`
    if (this.downNodeStack.length < this.leftListBlockStack.length) {
      this.leftListBlockStack.pop()
      const leftChildren = this.leftChildSetStack.pop()
      const nodes = leftChildren.map((serNode) => deserializeNode(serNode))

      // TODO: This is ok for now, because left childsets are always tokens
      // and always match the current fragment node category.
      // Really though, there's a risk that the fragment nodes are a different category to the left nodes.
      this.fragmentNodes.push(...nodes)
    } else if (this.downNodeStack.length === 0) {
      // Deserializing also repairs any missing/broken childsets
      this.fragmentNodes.push(deserializeNode(serNode))
    }
  }

  visitedRangeLeft(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    const children = this.childSetStack.pop().slice(0, endIndex - startIndex)
    this.childSetStack.push([])
    if (children.length !== 0) {
      this.leftChildSetStack[this.leftChildSetStack.length - 1].push(...children)
      this.leftListBlockStack.pop()
      this.leftListBlockStack.push(listBlock)
    }
  }

  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    // Copy these children into the current shallow-cloned node
    const children = this.childSetStack.pop()
    if (this.downNodeStack.length !== 0) {
      const currentNode = this.downNodeStack[this.downNodeStack.length - 1]
      currentNode.childSets[listBlock.parentRef.childSetId] = children
    } else {
      if (this.fragmentNodes.length !== 0) {
        const fragment = new SplootFragment(this.fragmentNodes, listBlock.childSet.nodeCategory, false /* don't trim */)
        this.fragment = combineFragments(this.fragment, fragment)
        this.fragmentNodes = []
      }
    }
    // Prep for next childset
    this.childSetStack.push([])
  }

  getFragment(): SplootFragment {
    if (this.fragment) {
      this.fragment.trim()
      return this.fragment
    }
    return null
  }
}
