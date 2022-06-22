import { BRACKET_WIDTH, NODE_BLOCK_HEIGHT, NODE_INLINE_SPACING, ROW_SPACING } from './layout_constants'
import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class TreeLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  labels: string[]

  lineStartCursorPositions: [number, number][]
  lineEndCursorPositions: [number, number][]

  constructor(layoutComponent: LayoutComponent) {
    this.labels = layoutComponent.metadata
    this.lineStartCursorPositions = []
    this.lineEndCursorPositions = []
  }

  updateLayout(layoutComponent: LayoutComponent): void {
    if (layoutComponent.labels) {
      this.labels = layoutComponent.labels
    } else {
      this.labels = []
    }
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
    this.lineStartCursorPositions = []
    this.lineEndCursorPositions = []

    if (nodes.length === 0) {
      this.width = BRACKET_WIDTH * 2 + NODE_INLINE_SPACING
    }

    let topPos = y
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, insertBoxWidth)
      }
      let label = undefined
      // If node (likely an expression) is empty, make enough space for the placeholder text.
      if (this.labels.length > idx && childNodeBlock.node.isEmpty()) {
        label = this.labels[idx]
      }
      this.lineStartCursorPositions.push([x + BRACKET_WIDTH, topPos])
      childNodeBlock.calculateDimensions(x + BRACKET_WIDTH, topPos, selection, false, label)
      this.lineEndCursorPositions.push([x + BRACKET_WIDTH + childNodeBlock.rowWidth, topPos])
      topPos += childNodeBlock.rowHeight + ROW_SPACING
      this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.width = Math.max(this.width, childNodeBlock.rowWidth + BRACKET_WIDTH * 2)
    })
    if (nodes.length === insertIndex) {
      this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.width = Math.max(this.width, insertBoxWidth)
    }
    if (nodes.length > 0) {
      this.height -= ROW_SPACING // Remove extra space at the end
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    console.warn('Attempting to get cursor position for tree childset.')
    return [this.x, this.y]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return false
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.lineStartCursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(new NodeCursor(renderedChildSet, i), pos[0], pos[1], CursorType.LineStart)
    })
    this.lineEndCursorPositions.forEach((pos, i) => {
      cursorMap.registerEndCursor(new NodeCursor(renderedChildSet, i + 1), pos[0], pos[1])
    })
  }
}
