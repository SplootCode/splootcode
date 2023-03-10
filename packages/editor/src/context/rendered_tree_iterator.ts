import { NodeBlock } from '../layout/rendered_node'
import { NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

export class RenderedTreeIterator {
  start: NodeCursor
  end: NodeCursor
  finished: boolean
  cursorStack: [NodeCursor, boolean][]

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
    this.loadStackAfterNode(this.start.listBlock, this.start.index, true, false)
  }

  loadStackAfterNode(listBlock: RenderedChildSetBlock, index: number, includeNode: boolean, pointsAtNode: boolean) {
    if (listBlock) {
      const parentNode = listBlock.parentRef.node

      const childSetOrder = parentNode.childSetOrder
      const childSetOrderIndex = childSetOrder.indexOf(listBlock.childSet.childParentRef.childSetId)

      let isLeftChild = false
      if (
        [parentNode.leftBreadcrumbChildSet, parentNode.beforeStackChildSet].includes(
          listBlock.childSet.childParentRef.childSetId
        )
      ) {
        isLeftChild = true
      }

      if (isLeftChild) {
        // Push all the stack after the parent first.
        this.loadStackAfterNode(parentNode.parentChildSet, parentNode.index, true, true)
      } else {
        // Push all the stack after the parent first.
        this.loadStackAfterNode(parentNode.parentChildSet, parentNode.index, false, false)

        // Childsets after this one in the parent childset order
        const childSetCursors: [NodeCursor, boolean][] = []
        childSetOrder.forEach((childSetID, idx) => {
          if (idx > childSetOrderIndex && childSetID !== parentNode.leftBreadcrumbChildSet) {
            childSetCursors.push([new NodeCursor(parentNode.renderedChildSets[childSetID], 0), true /* isCursor */])
          }
        })
        childSetCursors.reverse()
        this.cursorStack.push(...childSetCursors)
      }

      // Remaining positions in the same childset as node
      if (includeNode || pointsAtNode) {
        this.cursorStack.push([new NodeCursor(listBlock, index), !pointsAtNode])
      } else {
        this.cursorStack.push([new NodeCursor(listBlock, index + 1), true /* isCursor */])
      }
    }
  }

  visitNodeDown(node: NodeBlock) {}

  visitNodeMiddle(node: NodeBlock) {}

  visitNodeUp(node: NodeBlock) {}

  startRangeLeft() {}
  visitedRangeLeft(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {}
  startRangeRight() {}
  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {}

  walkNodeLeft(node: NodeBlock) {
    if (node.beforeStackChildSet) {
      this.walkChildSet(node.renderedChildSets[node.beforeStackChildSet], 0, false)
    }
    if (node.leftBreadcrumbChildSet) {
      this.walkChildSet(node.renderedChildSets[node.leftBreadcrumbChildSet], 0, false)
    }
  }

  walkNode(node: NodeBlock) {
    this.visitNodeMiddle(node)
    for (const childSetID of node.childSetOrder) {
      if (childSetID !== node.leftBreadcrumbChildSet && childSetID !== node.beforeStackChildSet) {
        const listBlock = node.renderedChildSets[childSetID]
        this.walkChildSet(listBlock, 0, false)
      }
    }
    this.visitNodeUp(node)
  }

  walkChildSet(listBlock: RenderedChildSetBlock, startIndex: number, startMidNode: boolean) {
    const isLeft =
      listBlock.parentRef.childSetId === listBlock.parentRef.node.leftBreadcrumbChildSet ||
      listBlock.parentRef.childSetId === listBlock.parentRef.node.beforeStackChildSet
    if (isLeft) {
      this.startRangeLeft()
    } else {
      this.startRangeRight()
    }

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
      if (!startMidNode || i !== startIndex) {
        this.walkNodeLeft(node)
      }
      if (this.finished) {
        this.visitNodeUp(node)
        break
      }
      this.walkNode(node)
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
      const [cursor, isCursor] = this.cursorStack.pop()
      if (isCursor) {
        this.walkChildSet(cursor.listBlock, cursor.index, false)
      } else {
        this.walkChildSet(cursor.listBlock, cursor.index, true)
      }
    }
  }
}
