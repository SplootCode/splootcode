import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NODE_INLINE_SPACING, NodeBlock } from './rendered_node'
import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class BreadcrumbsLayoutHandler implements ChildSetLayoutHandler {
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
    if (nodes.length === 0) {
      leftPos += NODE_INLINE_SPACING * 2
      this.width += NODE_INLINE_SPACING * 2
      this.cursorPositions.push([x, y])
    }
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        this.width += insertBoxWidth
        leftPos += insertBoxWidth
      }
      childNodeBlock.calculateDimensions(leftPos, y, selection)
      leftPos += childNodeBlock.rowWidth
      this.width += childNodeBlock.rowWidth
      this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
    })
    if (nodes.length === insertIndex) {
      this.width += insertBoxWidth
      leftPos += insertBoxWidth
    }
  }

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number] {
    if (this.cursorPositions.length === 1 && cursorOnly) {
      const [x, y] = this.cursorPositions[0]
      return [x + 3, y]
    }
    return [this.x, this.y]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex === 0 && this.cursorPositions.length === 1
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(renderedChildSet, i, pos[0], pos[1], true)
    })
  }
}
