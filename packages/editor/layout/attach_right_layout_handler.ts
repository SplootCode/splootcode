import { BRACKET_WIDTH, EXPRESSION_TOKEN_SPACING, NODE_BLOCK_HEIGHT } from './layout_constants'
import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class AttachRightLayoutHandler implements ChildSetLayoutHandler {
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

    let leftPos = x + BRACKET_WIDTH // starting bracket space
    this.width += 0
    this.height = NODE_BLOCK_HEIGHT
    if (allowInsert) {
      this.cursorPositions.push([leftPos, y])
      leftPos += EXPRESSION_TOKEN_SPACING
      this.width += EXPRESSION_TOKEN_SPACING
    }
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      childNodeBlock.calculateDimensions(leftPos, y, selection)
      if (allowInsert) {
        this.cursorPositions.push([leftPos + childNodeBlock.rowWidth, y])
      }
      leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      this.width += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
    })

    if (!allowInsert) {
      this.width -= EXPRESSION_TOKEN_SPACING
    }
    this.width += BRACKET_WIDTH * 2 // Space for brackets at start and end
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    const [x, y] = this.cursorPositions[insertIndex]
    return [x + 3, y]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex < this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(new NodeCursor(renderedChildSet, i), pos[0], pos[1], CursorType.Primary)
    })
  }
}
