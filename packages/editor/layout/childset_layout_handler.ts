import { CursorMap } from '../context/cursor_map'
import { LayoutComponent } from '@splootcode/core/language/type_registry'
import { NodeBlock } from './rendered_node'
import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from './rendered_childset_block'

export interface ChildSetLayoutHandler {
  x: number
  y: number
  width: number
  height: number
  marginTop: number

  updateLayout(layoutComponent: LayoutComponent): void
  calculateDimensions(
    x: number,
    y: number,
    nodes: NodeBlock[],
    selection: NodeSelection,
    allowInsert: boolean,
    insertCursor: number,
    insertBoxWidth: number,
    marginAlreadyApplied?: boolean
  ): void

  getInsertCoordinates(insertIndex: number, cursorOnly?: boolean): [number, number]

  registerCursorPositions(cursorMap: CursorMap, renderedChildSet: RenderedChildSetBlock): void
}
