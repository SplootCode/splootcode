import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NodeBlock } from './rendered_node'
import { NodeSelection } from '../context/selection'
import { ROW_SPACING, RenderedChildSetBlock } from './rendered_childset_block'

const INDENTED_BLOCK_PADDING_BOTTOM = 16
const INDENT = 30

export class BlockChildSetLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  cursorPositions: [number, number][]

  includeEndCursorPosition: boolean

  constructor(layoutComponent: LayoutComponent) {
    this.cursorPositions = []
    this.includeEndCursorPosition = !!layoutComponent.metadata?.endCursor
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

    const leftPos = x + INDENT

    let topPos = y + ROW_SPACING

    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, insertBoxWidth)
      }
      childNodeBlock.calculateDimensions(leftPos, topPos, selection, true)
      this.cursorPositions.push([leftPos - 3, topPos + childNodeBlock.marginTop])
      topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.width = Math.max(this.width, childNodeBlock.rowWidth)
    })

    if (this.includeEndCursorPosition) {
      this.cursorPositions.push([leftPos - 1, topPos])
    }
    this.height += INDENTED_BLOCK_PADDING_BOTTOM

    if (nodes.length === insertIndex) {
      this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.width = Math.max(this.width, insertBoxWidth)
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    return this.cursorPositions[insertIndex]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex < this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerLineCursor(renderedChildSet, i, pos[1])
    })
  }
}
