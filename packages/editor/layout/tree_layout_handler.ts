import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NodeBlock } from './rendered_node'
import { NodeSelection } from '../context/selection'
import { ROW_SPACING, RenderedChildSetBlock, getTextWidth } from './rendered_childset_block'

function labelStringWidth(s: string) {
  return getTextWidth(s, "9pt 'Source Sans Pro'")
}

export class TreeLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  cursorPositions: [number, number][]
  childSetTreeLabels: string[]

  constructor(layoutComponent: LayoutComponent) {
    this.cursorPositions = []
    this.childSetTreeLabels = layoutComponent.metadata
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
    this.cursorPositions = []

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
      childNodeBlock.calculateDimensions(x + indent, topPos, selection)
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

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(renderedChildSet, i, pos[0], pos[1], true)
    })
  }
}
