import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core'
import { NODE_INLINE_SPACING, ROW_SPACING } from './layout_constants'
import { NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class BeforeStackLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  cursorPositions: [number, number][]
  endCursorPositions: [number, number][]

  constructor() {
    this.cursorPositions = []
  }

  updateLayout(layoutComponent: LayoutComponent): void {
    // N/A
  }

  calculateDimensions(
    x: number,
    y: number,
    nodes: NodeBlock[],
    selection: NodeSelection,
    allowInsert: boolean,
    insertIndex: number,
    insertBoxWidth: number,
    marginAlreadyApplied?: boolean
  ): void {
    this.x = x
    this.y = y
    this.width = 0
    this.height = 0
    this.marginTop = 0
    this.cursorPositions = []
    this.endCursorPositions = []

    let topPos = y

    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      childNodeBlock.calculateDimensions(x, topPos, selection, true)
      this.cursorPositions.push([x - NODE_INLINE_SPACING, topPos + childNodeBlock.marginTop])
      this.endCursorPositions.push([
        x + childNodeBlock.rowWidth + NODE_INLINE_SPACING,
        topPos + childNodeBlock.marginTop,
      ])
      topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.width = Math.max(this.width, childNodeBlock.width)
    })

    this.cursorPositions.push([x - NODE_INLINE_SPACING, y + this.height])
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    // Hack to not throw errors when deleting an else statement.
    if (insertIndex >= this.cursorPositions.length) {
      return [this.x, this.y + this.height]
    }
    return this.cursorPositions[insertIndex]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex < this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      if (i === 0) {
        cursorMap.registerSupplementaryCursor(new NodeCursor(renderedChildSet, i), pos[0], pos[1])
      } else {
        cursorMap.registerCursorStart(new NodeCursor(renderedChildSet, i), pos[0], pos[1], CursorType.LineStart)
      }
    })
    this.endCursorPositions.forEach((pos, i) => {
      cursorMap.registerEndCursor(new NodeCursor(renderedChildSet, i + 1), pos[0], pos[1])
    })
  }
}
