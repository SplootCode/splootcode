import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

export class RenderedTreeIterator {
  start: NodeCursor
  end: NodeCursor
  finished: boolean

  cursorStack: NodeCursor[]

  constructor(start: NodeCursor, end: NodeCursor) {
    this.start = start
    this.end = end
    this.cursorStack = []
    this.finished = false

    // Build stack up to tree root
    this.loadStackAfterNode(start.listBlock, start.index, true)
  }

  loadStackAfterNode(listBlock: RenderedChildSetBlock, index: number, includeNode = false) {
    if (listBlock) {
      const parentNode = listBlock.parentRef.node
      // Load all the stack after the parent first.
      this.loadStackAfterNode(parentNode.parentChildSet, parentNode.index)

      const childSetOrder = parentNode.childSetOrder
      const childSetOrderIndex = childSetOrder.indexOf(listBlock.childSet.childParentRef.childSetId)

      // Childsets after this one in the childset order
      const childSetCursors: NodeCursor[] = []
      childSetOrder.forEach((childSetID, idx) => {
        if (idx > childSetOrderIndex) {
          childSetCursors.push(new NodeCursor(parentNode.renderedChildSets[childSetID], 0))
        }
      })
      childSetCursors.reverse()
      this.cursorStack.push(...childSetCursors)

      // Remaining positions in the same childset as node
      if (includeNode) {
        this.cursorStack.push(new NodeCursor(listBlock, index))
      } else {
        this.cursorStack.push(new NodeCursor(listBlock, index + 1))
      }
    }
  }

  visitNodeDown(node: NodeBlock) {}

  visitNodeUp(node: NodeBlock) {}

  visitedRange(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {}

  walkNode(node: NodeBlock) {
    this.visitNodeDown(node)
    for (const childSetID of node.childSetOrder) {
      const listBlock = node.renderedChildSets[childSetID]
      this.walkChildSet(listBlock, 0)
    }
    this.visitNodeUp(node)
  }

  walkChildSet(listBlock: RenderedChildSetBlock, startIndex: number) {
    let end = listBlock.nodes.length
    if (listBlock === this.end.listBlock) {
      end = this.end.index
    }
    let i = startIndex
    for (; i < end; i++) {
      if (this.finished) {
        break
      }
      this.walkNode(listBlock.nodes[i])
    }
    if (listBlock === this.end.listBlock) {
      this.finished = true
    }
    this.visitedRange(listBlock, startIndex, i)
  }

  walkToEnd() {
    while (!this.finished && this.cursorStack.length !== 0) {
      const cursor = this.cursorStack.pop()
      this.walkChildSet(cursor.listBlock, cursor.index)
    }
  }
}
