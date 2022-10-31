import { ChildSetLayoutHandler } from './childset_layout_handler'
import { CursorMap, CursorType } from '../context/cursor_map'
import { EXPRESSION_TOKEN_SPACING, NODE_INLINE_SPACING, placeholderWidth } from './layout_constants'
import { LayoutComponent } from '@splootcode/core'
import { NodeBlock } from './rendered_node'
import { NodeCursor, NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export class TokenLayoutHandler implements ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number
  labels: string[]

  cursorPositions: [number, number][]

  constructor() {
    this.cursorPositions = []
    this.labels = []
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
    this.cursorPositions = []

    let label = undefined
    if (this.labels.length > 0) {
      label = this.labels[0]
    }

    let leftPos = x
    this.cursorPositions.push([leftPos, y])
    if (allowInsert) {
      this.width += NODE_INLINE_SPACING
      leftPos += NODE_INLINE_SPACING
    }
    if (nodes.length === 0) {
      if (label) {
        this.width = placeholderWidth(label)
      } else {
        this.width += NODE_INLINE_SPACING
      }
    } else if (!allowInsert) {
      this.width -= NODE_INLINE_SPACING
    }
    nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
      if (idx === insertIndex) {
        this.width += insertBoxWidth
        leftPos += insertBoxWidth
      }
      let nodeLabel = undefined
      if (this.labels.length > idx) {
        nodeLabel = this.labels[idx]
      }
      childNodeBlock.calculateDimensions(
        leftPos,
        y,
        selection,
        idx === 0 && (marginAlreadyApplied || allowInsert),
        nodeLabel
      )
      this.marginTop = Math.max(this.marginTop, childNodeBlock.marginTop)
      this.cursorPositions.push([leftPos + childNodeBlock.rowWidth, y])

      leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      this.width += childNodeBlock.width + EXPRESSION_TOKEN_SPACING
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
      return [x + 5, y + this.marginTop]
    }
    // Work around because invalid cursor positions pop up temporarily during edits.
    if (insertIndex < this.cursorPositions.length) {
      const [x, y] = this.cursorPositions[insertIndex]
      return [x, y + this.marginTop]
    }
    return [this.x, this.y + this.marginTop]
  }

  allowInsertCursor(insertIndex: number): boolean {
    return insertIndex <= this.cursorPositions.length
  }

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void {
    this.cursorPositions.forEach((pos, i) => {
      cursorMap.registerCursorStart(
        new NodeCursor(renderedChildSet, i),
        pos[0],
        pos[1] + this.marginTop,
        CursorType.Primary
      )
    })
  }
}
