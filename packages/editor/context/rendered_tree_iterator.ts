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

    if (this.start.greaterThan(this.end)) {
      this.start = end
      this.end = start
    }

    // Build stack up to tree root
    this.loadStackAfterNode(this.start.listBlock, this.start.index, true)
  }

  loadStackAfterNode(listBlock: RenderedChildSetBlock, index: number, includeNode = false) {
    if (listBlock) {
      const parentNode = listBlock.parentRef.node

      const childSetOrder = parentNode.childSetOrder
      const childSetOrderIndex = childSetOrder.indexOf(listBlock.childSet.childParentRef.childSetId)

      let includeParentNode = false
      if (listBlock.childSet.childParentRef.childSetId === parentNode.leftBreadcrumbChildSet) {
        includeParentNode = true
      }

      // Load all the stack after the parent first.
      this.loadStackAfterNode(parentNode.parentChildSet, parentNode.index, includeParentNode)
      if (includeParentNode) {
        return
      }

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

  visitNodeMiddle(node: NodeBlock) {}

  visitNodeUp(node: NodeBlock) {}

  visitedRangeLeft(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {}
  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {}

  walkNodeLeft(node: NodeBlock) {
    if (node.leftBreadcrumbChildSet) {
      this.walkChildSet(node.renderedChildSets[node.leftBreadcrumbChildSet], 0, true)
    }
  }

  walkNode(node: NodeBlock) {
    this.visitNodeMiddle(node)
    for (const childSetID of node.childSetOrder) {
      if (childSetID !== node.leftBreadcrumbChildSet) {
        const listBlock = node.renderedChildSets[childSetID]
        this.walkChildSet(listBlock, 0, false)
      }
    }
  }

  walkChildSet(listBlock: RenderedChildSetBlock, startIndex: number, isLeft: boolean) {
    let end = listBlock.nodes.length
    if (listBlock === this.end.listBlock) {
      end = this.end.index
    }
    if (listBlock === this.start.listBlock) {
      startIndex = this.start.index
    }
    let i = startIndex
    for (; i < end; i++) {
      if (this.finished) {
        break
      }
      const node = listBlock.nodes[i]
      this.visitNodeDown(node)
      this.walkNodeLeft(node)
      if (this.finished) {
        this.visitNodeUp(node)
        break
      }
      this.walkNode(node)
      this.visitNodeUp(node)
    }
    if (listBlock === this.end.listBlock) {
      this.finished = true
    }
    if (isLeft) {
      this.visitedRangeLeft(listBlock, startIndex, i)
    } else {
      this.visitedRangeRight(listBlock, startIndex, i)
    }
  }

  walkToEnd() {
    while (!this.finished && this.cursorStack.length !== 0) {
      const cursor = this.cursorStack.pop()
      this.walkChildSet(cursor.listBlock, cursor.index, false)
    }
  }
}
