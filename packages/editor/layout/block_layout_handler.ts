import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NODE_INLINE_SPACING, NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
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
  extraCursorPositions: [number, number][]

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
    this.extraCursorPositions = []

    const leftPos = x + INDENT

    let topPos = y + ROW_SPACING

    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, insertBoxWidth)
      }

      childNodeBlock.calculateDimensions(leftPos, topPos, selection, true)
      this.cursorPositions.push([leftPos - NODE_INLINE_SPACING, topPos])
      this.extraCursorPositions.push([leftPos + childNodeBlock.rowWidth, topPos])

      topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.width = Math.max(this.width, childNodeBlock.width)
    })

    if (this.includeEndCursorPosition) {
      this.cursorPositions.push([leftPos - NODE_INLINE_SPACING, topPos])
    }
    this.height += INDENTED_BLOCK_PADDING_BOTTOM

    if (nodes.length === insertIndex) {
      this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.width = Math.max(this.width, insertBoxWidth)
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    if (insertIndex < this.cursorPositions.length) {
      return this.cursorPositions[insertIndex]
    } else {
      return this.extraCursorPositions[this.extraCursorPositions.length - 1]
    }
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex <= this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      if (this.includeEndCursorPosition && i === this.cursorPositions.length - 1) {
        cursorMap.registerCursorStart(new NodeCursor(renderedChildSet, i), pos[0], pos[1], CursorType.Primary)
        return
      }
      cursorMap.registerCursorStart(new NodeCursor(renderedChildSet, i), pos[0], pos[1], CursorType.LineStart)
    })
    this.extraCursorPositions.forEach((pos, i) => {
      if (pos !== null) {
        cursorMap.registerEndCursor(new NodeCursor(renderedChildSet, i + 1), pos[0], pos[1])
      }
    })
  }
}
