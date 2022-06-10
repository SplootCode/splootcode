import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, ROW_SPACING, labelStringWidth } from './layout_constants'
import { NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class TreeLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  childSetTreeLabels: string[]

  lineStartCursorPositions: [number, number][]
  lineEndCursorPositions: [number, number][]

  constructor(layoutComponent: LayoutComponent) {
    this.childSetTreeLabels = layoutComponent.metadata
    this.lineStartCursorPositions = []
    this.lineEndCursorPositions = []
  }

  updateLayout(layoutComponent: LayoutComponent): void {
    if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
      this.childSetTreeLabels = layoutComponent.metadata
    } else {
      this.childSetTreeLabels = []
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

    const labels = this.childSetTreeLabels
    const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
    let topPos = y
    let indent = 24
    indent += maxLabelWidth
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, insertBoxWidth)
      }
      this.lineStartCursorPositions.push([x + indent, topPos])
      childNodeBlock.calculateDimensions(x + indent, topPos, selection)
      this.lineEndCursorPositions.push([x + indent + childNodeBlock.rowWidth, topPos])
      topPos += childNodeBlock.rowHeight + ROW_SPACING
      this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      this.width = Math.max(this.width, childNodeBlock.rowWidth + indent + 4) // 4 = Bracket at end.
    })
    if (nodes.length === insertIndex) {
      this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.width = Math.max(this.width, insertBoxWidth)
    }
    this.height -= ROW_SPACING // Remove extra space at the end
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
