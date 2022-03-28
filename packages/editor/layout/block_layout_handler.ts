import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap } from '../context/cursor_map'
import { INDENTED_BLOCK_PADDING_BOTTOM, NODE_BLOCK_HEIGHT, NodeBlock } from './rendered_node'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NodeSelection } from '../context/selection'
import { ROW_SPACING, RenderedChildSetBlock } from './rendered_childset_block'

const INDENT = 30

export class BlockChildSetLayoutHandler implements ChildSetLayoutHandler {
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
    this.height += INDENTED_BLOCK_PADDING_BOTTOM
    this.cursorPositions.push([leftPos - 3, topPos - ROW_SPACING])

    if (nodes.length === insertIndex) {
      this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.width = Math.max(this.width, insertBoxWidth)
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    return this.cursorPositions[insertIndex]
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerLineCursor(renderedChildSet, i, pos[1])
    })
  }
}
