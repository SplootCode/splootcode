import { ChildSet } from '@splootcode/core/language/childset'
import { CursorMap } from './cursor_map'
import { EditBoxData } from './edit_box'
import { InsertBoxData } from './insert_box'
import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory, getBlankFillForCategory } from '@splootcode/core/language/node_category_registry'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { SplootExpression } from '@splootcode/core/language/types/js/expression'
import { SplootNode } from '@splootcode/core/language/node'
import { action, computed, observable } from 'mobx'

export enum NodeSelectionState {
  UNSELECTED = 0,
  SELECTED,
  EDITING,
}

export enum SelectionState {
  Empty = 0,
  SingleNode,
  MultiNode,
  Cursor,
  Editing,
  Inserting,
}

export interface DragState {
  node: NodeBlock
  offsetX: number
  offsetY: number
}

export class NodeSelection {
  cursorMap: CursorMap
  rootNode: NodeBlock
  @observable
  cursor: NodeCursor
  @observable
  state: SelectionState
  @observable
  insertBox: InsertBoxData
  @observable
  editBox: EditBoxData

  @observable
  dragState: DragState | null

  lastXCoordinate: number
  lastYCoordinate: number

  constructor() {
    this.rootNode = null
    this.cursorMap = new CursorMap()
    this.cursor = null
    this.insertBox = null
    this.editBox = null
    this.state = SelectionState.Empty
    this.dragState = null
    this.lastXCoordinate = 0
    this.lastYCoordinate = 0
  }

  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode
    this.updateRenderPositions()
  }

  @computed get selectedNode() {
    if (!this.cursor || !this.state) {
      return null
    }
    return this.cursor.selectedNode()
  }

  updateRenderPositions() {
    this.cursorMap = new CursorMap()
    this.rootNode.calculateDimensions(-20, -26, this)
  }

  @observable
  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode
  }

  isSelectedNode(listBlock: RenderedChildSetBlock, index: number) {
    if (this.isSingleNode()) {
      return this.cursor.listBlock == listBlock && this.cursor.index == index
    }
    return false
  }

  @observable
  isEditingSingleNode() {
    return this.state === SelectionState.Editing
  }

  @observable
  getStateByIndex(index: number) {
    if (!this.cursor || !this.isSingleNode() || this.cursor.index !== index) {
      return NodeSelectionState.UNSELECTED
    }
    if (this.state === SelectionState.Editing) {
      return NodeSelectionState.EDITING
    }
    return NodeSelectionState.SELECTED
  }

  @observable
  getState(node: SplootNode) {
    if (!this.isSelected(node)) {
      return NodeSelectionState.UNSELECTED
    }
    if (this.state === SelectionState.Editing) {
      return NodeSelectionState.EDITING
    }
    return NodeSelectionState.SELECTED
  }

  @observable
  isSelected(node: SplootNode) {
    if (!this.cursor || this.isCursor()) {
      return false
    }
    return node === this.selectedNode
  }

  @observable
  isEditing(node: SplootNode) {
    return this.isSelected(node) && this.state === SelectionState.Editing
  }

  @action
  placeCursor(listBlock: RenderedChildSetBlock, index: number, updateXY = true) {
    this.exitEdit()
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty
    }
    this.cursor = new NodeCursor(listBlock, index)
    listBlock.selectedIndex = index
    listBlock.selectionState = SelectionState.Cursor
    this.insertBox = new InsertBoxData(listBlock.getInsertCoordinates(index))
    this.state = SelectionState.Cursor
    if (updateXY) {
      this.updateCursorXYToCursor()
    }
  }

  @action
  deleteSelectedNode() {
    if (this.state === SelectionState.SingleNode) {
      this.exitEdit()
      if (this.cursor) {
        this.cursor.listBlock.selectionState = SelectionState.Empty
      }
      const listBlock = this.cursor.listBlock
      listBlock.childSet.removeChild(this.cursor.index)
      // Trigger a clean from the parent upward.
      listBlock.parentRef.node.node.clean()
      this.updateRenderPositions()
      this.updateCursorXYToCursor()
    }
  }

  @action
  startInsertAtCurrentCursor() {
    this.state = SelectionState.Inserting
    this.updateRenderPositions()
  }

  @action
  startEditAtCurrentCursor() {
    if (this.isSingleNode()) {
      const index = this.cursor.index
      // Return null if not editable node.
      this.editBox = this.cursor.listBlock.getEditData(index)
      if (this.editBox !== null) {
        this.cursor.listBlock.selectionState = SelectionState.Editing
        this.setState(SelectionState.Editing)
        this.updateRenderPositions()
      }
    }
  }

  @action
  updatePropertyEdit(newValue: string) {
    if (this.isEditingSingleNode()) {
      const property = this.editBox.property
      this.cursor.listBlock.nodes[this.cursor.index].node.setPropertyFromString(property, newValue)
      this.updateRenderPositions()
    }
  }

  updateCursorXYToCursor() {
    const cursor = this.cursor
    const [x, y] = cursor.listBlock.getInsertCoordinates(cursor.index, true)
    this.lastXCoordinate = x
    this.lastYCoordinate = y
  }

  @action
  moveCursorToNextInsert() {
    if (this.cursor) {
      const newCursor = this.cursor.listBlock.getNextInsertCursorInOrAfterNode(this.cursor.index)
      if (newCursor) {
        this.placeCursor(newCursor.listBlock, newCursor.index)
      }
    } else {
      // Use root node instead
    }
  }

  @action
  unindent() {
    const newLineCursor = this.cursor.listBlock.getUnindent(this.cursor.index)
    if (newLineCursor) {
      const deleteNode = this.cursor.listBlock.parentRef.node
      deleteNode.parentChildSet.childSet.removeChild(deleteNode.index)

      const category = newLineCursor.listBlock.childSet.nodeCategory
      const node = getBlankFillForCategory(category)
      if (node) {
        this.insertNode(newLineCursor.listBlock, newLineCursor.index, node)
        this.updateRenderPositions()
        this.placeCursor(newLineCursor.listBlock, newLineCursor.index)
        this.updateCursorXYToCursor()
        // Hack! To get around invalid/overlapping cursor positions
        this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate)
        return true
      }
    }
    return false
  }

  @action
  insertNewlineOrUnindent() {
    const didUnindent = this.unindent()
    if (didUnindent) {
      return
    }
    const [newLineCursor, postInsertCursor] = this.cursor.listBlock.getNewLinePosition(this.cursor.index)
    if (!newLineCursor) {
      return
    }
    const category = newLineCursor.listBlock.childSet.nodeCategory
    const node = getBlankFillForCategory(category)
    if (node) {
      this.insertNode(newLineCursor.listBlock, newLineCursor.index, node)
      this.updateRenderPositions()
      this.placeCursor(postInsertCursor.listBlock, postInsertCursor.index)
      while (!this.cursor.listBlock.allowInsertCursor()) {
        this.moveCursorToNextInsert()
      }
      this.updateCursorXYToCursor()
      // Hack! To get around invalid/overlapping cursor positions
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate)
    }
  }

  @action
  backspace() {
    const didUnindent = this.unindent()
    if (didUnindent) {
      return
    }
    this.moveCursorLeft()
    if (this.isSingleNode()) {
      this.deleteSelectedNode()
    } else {
      const cursor = this.cursor.listBlock.getLineNodeIfEmpty()
      if (cursor) {
        cursor.listBlock.childSet.removeChild(cursor.index)
        this.updateRenderPositions()
      }
      this.updateCursorXYToCursor()
    }
  }

  @action
  startInsertNode(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit()
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty
    }
    this.cursor = new NodeCursor(listBlock, index)
    listBlock.selectedIndex = index
    listBlock.selectionState = SelectionState.Inserting
    this.state = SelectionState.Inserting
    this.insertBox = new InsertBoxData(listBlock.getInsertCoordinates(index))
    this.updateRenderPositions()
  }

  @action
  insertNode(listBlock: RenderedChildSetBlock, index: number, node: SplootNode) {
    this.insertNodeByChildSet(listBlock.childSet, index, node)
  }

  insertNodeAtCurrentCursor(node: SplootNode) {
    if (this.isCursor()) {
      this.insertNode(this.cursor.listBlock, this.cursor.index, node)
    }
  }

  @action
  insertNodeByChildSet(childSet: ChildSet, index: number, node: SplootNode) {
    // Insert node will also update the render positions
    childSet.insertNode(node, index)
    // Trigger a clean from the parent upward.
    node.parent.node.clean()
  }

  @action
  wrapNode(listBlock: RenderedChildSetBlock, index: number, node: SplootNode, childSetId: string) {
    // remove child at index
    const child = listBlock.childSet.removeChild(index)
    const childSet = node.getChildSet(childSetId)
    if (childSet.nodeCategory === NodeCategory.Expression) {
      ;(childSet.getChild(0) as SplootExpression).getTokenSet().addChild(child)
    } else {
      childSet.addChild(child)
    }
    // insert node at index.
    listBlock.childSet.insertNode(node, index)
  }

  @action
  exitEdit() {
    if (this.state === SelectionState.Editing) {
      this.editBox = null
      this.setState(SelectionState.SingleNode)
      this.cursor.listBlock.selectionState = SelectionState.SingleNode
      this.updateRenderPositions()
    }
    if (this.state == SelectionState.Inserting) {
      this.state = SelectionState.Cursor
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate)
      this.updateRenderPositions()
    }
  }

  @action
  clearSelection() {
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty
    }
    this.state = SelectionState.Empty
    this.cursor = null
  }

  setState(newState: SelectionState) {
    this.state = newState
  }

  getPasteDestinationCategory(): NodeCategory {
    if (this.cursor) {
      return this.cursor.listBlock.childSet.nodeCategory
    }
  }

  @action
  selectNodeByIndex(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit()
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty
    }
    this.cursor = new NodeCursor(listBlock, index)
    listBlock.selectedIndex = index
    listBlock.selectionState = SelectionState.SingleNode
    this.setState(SelectionState.SingleNode)
  }

  @action
  moveCursorRight() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfCoordinate(
      this.lastXCoordinate,
      this.lastYCoordinate
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index)
    }
  }

  @action
  moveCursorLeft() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfCoordinate(
      this.lastXCoordinate,
      this.lastYCoordinate
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index)
    }
  }

  @action
  moveCursorUp() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorUpOfCoordinate(this.lastXCoordinate, this.lastYCoordinate)
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index)
    }
  }

  @action
  moveCursorDown() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorDownOfCoordinate(
      this.lastXCoordinate,
      this.lastYCoordinate
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index)
    }
  }

  startDrag(nodeBlock: NodeBlock, offsetX: number, offestY: number) {
    const tempNodeBlock = new NodeBlock(null, nodeBlock.node, null, 0)
    tempNodeBlock.calculateDimensions(0, 0, null)
    this.dragState = {
      node: tempNodeBlock,
      offsetX: offsetX,
      offsetY: offestY,
    }
  }

  handleClick(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      if (this.isSelectedNode(cursor.listBlock, cursor.index)) {
        this.startEditAtCurrentCursor()
      } else {
        this.selectNodeByIndex(cursor.listBlock, cursor.index)
      }
    }
  }

  placeCursorByXYCoordinate(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false)
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index)
    }
  }

  endDrag() {
    this.dragState = null
  }
}

export class NodeCursor {
  @observable
  listBlock: RenderedChildSetBlock
  @observable
  index: number

  constructor(listBlock: RenderedChildSetBlock, index: number) {
    this.listBlock = listBlock
    this.index = index
  }

  selectedNode() {
    if (!this.listBlock) {
      return null
    }
    return this.listBlock.childSet.getChildren()[this.index]
  }
}
