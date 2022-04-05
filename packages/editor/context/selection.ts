import { ChildSet } from '@splootcode/core/language/childset'
import { CursorMap } from './cursor_map'
import { EditBoxData } from './edit_box'
import { InsertBoxData } from './insert_box'
import { NodeBlock } from '../layout/rendered_node'
import {
  NodeCategory,
  getBlankFillForCategory,
  isNodeInCategory,
} from '@splootcode/core/language/node_category_registry'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedFragment } from '../layout/rendered_fragment'
import { SplootFragment } from '@splootcode/core/language/types/fragment'
import { SplootNode } from '@splootcode/core/language/node'
import { action, computed, observable } from 'mobx'
import { adaptNodeToPasteDestination, isAdaptableToPasteDesintation } from '@splootcode/core/language/type_registry'

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
  node: RenderedFragment
  offsetX: number
  offsetY: number
}

export interface CursorPosition {
  lineIndex: number
  entryIndex: number
}

export class NodeSelection {
  cursorMap: CursorMap

  rootNode: NodeBlock

  @observable
  selectionStart: NodeCursor

  @observable
  cursor: CursorPosition

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
    this.selectionStart = null
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
    if (!this.selectionStart || !this.state) {
      return null
    }
    return this.selectionStart.selectedNode()
  }

  updateRenderPositions() {
    this.cursorMap = new CursorMap()
    this.rootNode.calculateDimensions(-20, -26, this)
  }

  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode
  }

  isSelectedNode(listBlock: RenderedChildSetBlock, index: number) {
    if (this.isSingleNode()) {
      return this.selectionStart.listBlock == listBlock && this.selectionStart.index == index
    }
    return false
  }

  isSelectedNodeAtPosition(position: CursorPosition): boolean {
    return (
      this.isSingleNode() &&
      this.cursor.lineIndex === position.lineIndex &&
      this.cursor.entryIndex === position.entryIndex
    )
  }

  isEditingSingleNode() {
    return this.state === SelectionState.Editing
  }

  @action
  placeCursor(listBlock: RenderedChildSetBlock, index: number, updateXY = true) {
    this.cursor = listBlock.getCursorPosition(this.cursorMap, index)
    this.placeCursorPosition(this.cursor, updateXY)
  }

  placeCursorPosition(position: CursorPosition, updateXY = true) {
    this.exitEdit()
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
      this.selectionStart = null
    }
    this.cursor = position
    this.insertBox = new InsertBoxData(this.cursorMap.getCoordinates(position))
    this.state = SelectionState.Cursor
    if (updateXY) {
      this.updateCursorXYToCursor()
    }
  }

  getCurrentNodeCursors(): NodeCursor[] {
    if (this.isCursor()) {
      return this.cursorMap.getNodeCursorsForCursorPosition(this.cursor)
    }
    return []
  }

  getCursorXYPosition(): [number, number] {
    if (this.isCursor()) {
      return this.cursorMap.getCoordinates(this.cursor)
    }
    return [100, 100]
  }

  @action
  deleteSelectedNode() {
    if (this.state === SelectionState.SingleNode) {
      this.exitEdit()
      if (this.selectionStart) {
        this.selectionStart.listBlock.selectionState = SelectionState.Empty
      }
      const listBlock = this.selectionStart.listBlock
      let index = this.selectionStart.index

      const deletedNode = listBlock.childSet.removeChild(this.selectionStart.index)
      const newNodes = deletedNode.getChildrenToKeepOnDelete()

      newNodes.forEach((node) => {
        listBlock.childSet.insertNode(node, index)
        index++
      })
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
      const index = this.selectionStart.index
      // Return null if not editable node.
      this.editBox = this.selectionStart.listBlock.getEditData(index)
      if (this.editBox !== null) {
        this.selectionStart.listBlock.selectionState = SelectionState.Editing
        this.setState(SelectionState.Editing)
        this.updateRenderPositions()
      }
    }
  }

  @action
  updatePropertyEdit(newValue: string) {
    if (this.isEditingSingleNode()) {
      this.selectionStart.listBlock.nodes[this.selectionStart.index].node.setEditablePropertyValue(newValue)
      this.updateRenderPositions()
    }
  }

  @action
  fixCursorToValidPosition() {
    if (!this.cursorMap.isValid(this.cursor)) {
      // Hack! To get around cursor positions that change when the node tree updates
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate)
    }
  }

  updateCursorXYToCursor() {
    const [x, y] = this.cursorMap.getCoordinates(this.cursor)
    this.lastXCoordinate = x
    this.lastYCoordinate = y
  }

  @action
  unindent() {
    const nodeCursors = this.getCurrentNodeCursors()
    for (const cursor of nodeCursors) {
      const [deleteNode, newLineCursor] = cursor.listBlock.getUnindent(cursor.index)
      if (newLineCursor) {
        if (deleteNode) {
          deleteNode.parentChildSet.childSet.removeChild(deleteNode.index)
        }
        const category = newLineCursor.listBlock.childSet.nodeCategory
        const node = getBlankFillForCategory(category)
        if (node) {
          this.insertNode(newLineCursor.listBlock, newLineCursor.index, node)
          return true
        } else {
          console.warn('No insertable node for category: ', category)
        }
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

    const nodeCursors = this.getCurrentNodeCursors()
    for (const cursor of nodeCursors) {
      const [newLineCursor, postInsertCursor] = cursor.listBlock.getNewLinePosition(cursor.index)
      if (!newLineCursor) {
        continue
      }
      const category = newLineCursor.listBlock.childSet.nodeCategory
      const node = getBlankFillForCategory(category)
      if (node) {
        this.insertNode(newLineCursor.listBlock, newLineCursor.index, node)
        if (postInsertCursor.listBlock.allowInsertCursor(postInsertCursor.index)) {
          this.placeCursor(postInsertCursor.listBlock, postInsertCursor.index)
        } else {
          const newCursor = postInsertCursor.listBlock.getNextInsertCursorInOrAfterNode(postInsertCursor.index)
          this.placeCursor(newCursor.listBlock, newCursor.index)
        }
        this.fixCursorToValidPosition()
      }
    }
  }

  @action
  backspace() {
    if (this.isSingleNode()) {
      this.deleteSelectedNode()
      return
    }

    const nodeCursors = this.cursorMap.getNodeCursorsForCursorPosition(this.cursor)
    for (const nodeCursor of nodeCursors) {
      const cursor = nodeCursor.listBlock.getDeleteCursorIfEmpty()
      if (cursor) {
        cursor.listBlock.childSet.removeChild(cursor.index)
        cursor.listBlock.parentRef.node.node.clean()
        // If we deleted a newline, then move left to end of previous line.
        if (cursor.listBlock.isInsertableLineChildset()) {
          this.moveCursorLeft()
        }
        return
      }
    }

    this.moveCursorLeft()
    if (this.isSingleNode()) {
      this.deleteSelectedNode()
    }
  }

  replaceOrWrapSelectedNode(node: SplootNode) {
    if (this.isSingleNode()) {
      this.exitEdit()
      if (this.selectionStart) {
        this.selectionStart.listBlock.selectionState = SelectionState.Empty
      }
      const childSet = this.selectionStart.listBlock.childSet
      const index = this.selectionStart.index

      const wrapped = this.wrapNodeOnPaste(childSet, index, node)
      if (!wrapped) {
        this.replaceNode(childSet, index, node)
      }
    }
  }

  wrapNodeOnPaste(childSet: ChildSet, index: number, node: SplootNode): boolean {
    let nodeToReplace = childSet.getChild(index)

    if (!isAdaptableToPasteDesintation(node, childSet.nodeCategory)) {
      // Would the parent be empty without that node?
      // Can we replace the parent instead?
      const parentRef = nodeToReplace.parent
      if (parentRef.node.childSetOrder.length === 1 && parentRef.getChildSet().getCount() === 1) {
        const destCategory = parentRef.node.parent.getChildSet().nodeCategory
        if (!isAdaptableToPasteDesintation(node, destCategory)) {
          return false
        }
        nodeToReplace = parentRef.node
        childSet = parentRef.node.parent.getChildSet()
        index = childSet.getIndexOf(parentRef.node)
      } else {
        return false
      }
    }

    const wrapChildSet = node.getWrapInsertChildSet(nodeToReplace)
    if (wrapChildSet) {
      const deletedNode = childSet.removeChild(index)
      const newChild = adaptNodeToPasteDestination(deletedNode, wrapChildSet.nodeCategory)

      // Clear all children from that childset (this is a detached node so it won't send mutations)
      while (wrapChildSet.getCount() !== 0) {
        wrapChildSet.removeChild(0)
      }
      wrapChildSet.insertNode(newChild, 0)
      this.insertNodeByChildSet(childSet, index, node)
      return true
    }
    return false
  }

  replaceNode(childSet: ChildSet, index: number, node: SplootNode) {
    const nodeToReplace = childSet.getChild(index)
    if (!isAdaptableToPasteDesintation(node, childSet.nodeCategory)) {
      // Would the parent be empty without that node?
      // Can we replace the parent instead?
      const parentRef = nodeToReplace.parent
      if (parentRef.node.childSetOrder.length === 1 && parentRef.getChildSet().getCount() === 1) {
        const destCategory = parentRef.node.parent.getChildSet().nodeCategory
        if (!isAdaptableToPasteDesintation(node, destCategory)) {
          return false
        }
        childSet = parentRef.node.parent.getChildSet()
        index = childSet.getIndexOf(parentRef.node)
      } else {
        return
      }
    }

    childSet.removeChild(index)
    this.insertNodeByChildSet(childSet, index, node)
  }

  insertFragmentAtCurrentCursor(fragment: SplootFragment) {
    if (this.isCursor()) {
      if (fragment.isSingle()) {
        this.insertNodeAtCurrentCursor(fragment.nodes[0])
        return
      }

      for (const cursor of this.getCurrentNodeCursors()) {
        const destCategory = cursor.listBlock.getPasteDestinationCategory()
        const adaptedNodes = fragment.nodes.map((node) => adaptNodeToPasteDestination(node, destCategory))
        const valid = adaptedNodes.filter((node) => node)
        if (adaptedNodes.length == valid.length) {
          const listBlock = cursor.listBlock
          let index = cursor.index
          for (const node of adaptedNodes) {
            this.insertNode(listBlock, index, node)
            index++
          }
          return
        } else {
          console.warn('Cannot paste there - not all nodes are compatible')
        }
      }
    }
  }

  insertNodeAtCurrentCursor(node: SplootNode) {
    if (this.isCursor()) {
      for (const cursor of this.getCurrentNodeCursors()) {
        const adaptedNode = adaptNodeToPasteDestination(node, cursor.listBlock.getPasteDestinationCategory())
        if (adaptedNode) {
          this.insertNode(cursor.listBlock, cursor.index, adaptedNode)
          return
        } else {
          // If it cannot be inserted, and it's the start of a childset, attempt a wrap of the parent.
          if (cursor.index === 0) {
            const parentNode = cursor.listBlock.parentRef.node
            this.wrapNodeOnPaste(parentNode.node.parent.getChildSet(), parentNode.index, node)
          }
        }
      }
    }
  }

  @action
  insertNode(listBlock: RenderedChildSetBlock, index: number, node: SplootNode) {
    this.insertNodeByChildSet(listBlock.childSet, index, node)
  }

  @action
  insertNodeByChildSet(childSet: ChildSet, index: number, node: SplootNode) {
    const valid = isNodeInCategory(node.type, childSet.nodeCategory)
    if (!valid) {
      const adapted = adaptNodeToPasteDestination(node, childSet.nodeCategory)
      if (!adapted) {
        console.warn(`Node type ${node.type} not valid for category: ${NodeCategory[childSet.nodeCategory]}`)
        return
      }
      // Insert node will also update the render positions
      childSet.insertNode(adapted, index)
      // Trigger a clean from the parent upward.
      adapted.parent.node.clean()
      return
    }
    // Insert node will also update the render positions
    childSet.insertNode(node, index)
    // Trigger a clean from the parent upward.
    node.parent.node.clean()
  }

  @action
  wrapNode(childSet: ChildSet, index: number, node: SplootNode, childSetId: string) {
    // Remove original child at index (sends mutations)
    const child = childSet.removeChild(index)
    const wrapChildSet = node.getChildSet(childSetId)
    // Clear all children from that childset (this is a detached node so it won't send mutations)
    while (wrapChildSet.getCount() !== 0) {
      wrapChildSet.removeChild(0)
    }
    wrapChildSet.addChild(child)

    // Insert the completed node
    childSet.insertNode(node, index)
  }

  @action
  exitEdit() {
    if (this.state === SelectionState.Editing) {
      this.editBox = null
      this.setState(SelectionState.SingleNode)
      this.selectionStart.listBlock.selectionState = SelectionState.SingleNode
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
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.state = SelectionState.Empty
    this.selectionStart = null
  }

  setState(newState: SelectionState) {
    this.state = newState
  }

  selectNodeAtPosition(postition: CursorPosition) {
    this.cursor = postition
    const nodeCursor = this.cursorMap.getNodeCursorsForCursorPosition(this.cursor)[0]
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.selectionStart = nodeCursor
    nodeCursor.listBlock.selectedIndex = nodeCursor.index
    nodeCursor.listBlock.selectionState = SelectionState.SingleNode
    this.setState(SelectionState.SingleNode)
  }

  @action
  moveCursorRight() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(this.cursor)

    this.lastXCoordinate = x
    this.lastYCoordinate = y

    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      this.selectNodeAtPosition(cursor)
    }
  }

  @action
  moveCursorLeft() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(this.cursor)
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      this.selectNodeAtPosition(cursor)
    }
  }

  @action
  moveCursorUp() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorUpOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      this.selectNodeAtPosition(cursor)
    }
  }

  @action
  moveCursorDown() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorDownOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      this.selectNodeAtPosition(cursor)
    }
  }

  startDrag(fragment: RenderedFragment, offsetX: number, offestY: number) {
    this.dragState = {
      node: fragment,
      offsetX: offsetX,
      offsetY: offestY,
    }
  }

  handleClick(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorPositionByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      if (this.isSelectedNodeAtPosition(cursor)) {
        this.startEditAtCurrentCursor()
      } else {
        this.selectNodeAtPosition(cursor)
      }
    }
  }

  placeCursorByXYCoordinate(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorPositionByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
    if (isCursor) {
      this.placeCursorPosition(cursor, false)
    } else {
      this.selectNodeAtPosition(cursor)
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
