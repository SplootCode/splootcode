import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap } from '../context/cursor_map'
import { EXPRESSION_TOKEN_SPACING, RenderedChildSetBlock } from './rendered_childset_block'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_INLINE_SPACING, NodeBlock } from './rendered_node'
import { NodeSelection } from '../context/selection'

export class TokenLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  cursorPositions: [number, number][]

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

    let leftPos = x
    this.cursorPositions.push([leftPos, y])
    if (allowInsert) {
      this.width += NODE_INLINE_SPACING
      leftPos += NODE_INLINE_SPACING
    }
    if (nodes.length === 0) {
      this.width += NODE_INLINE_SPACING
    } else if (!allowInsert) {
      this.width -= NODE_INLINE_SPACING
    }
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        this.width += insertBoxWidth
        leftPos += insertBoxWidth
      }
      childNodeBlock.calculateDimensions(leftPos, y, selection, idx === 0 && (marginAlreadyApplied || allowInsert))
      this.marginTop = Math.max(this.marginTop, childNodeBlock.marginTop)
      this.cursorPositions.push([leftPos + childNodeBlock.rowWidth, y])

      leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      this.width += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
    })
    if (nodes.length === insertIndex) {
      this.width += insertBoxWidth
      leftPos += insertBoxWidth
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    if (this.cursorPositions.length === 1) {
      const [x, y] = this.cursorPositions[insertIndex]
      return [x + 5, y]
    }
    const [x, y] = this.cursorPositions[insertIndex]
    return [x + 3, y]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex <= this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(renderedChildSet, i, pos[0], pos[1], true)
    })
  }
}
