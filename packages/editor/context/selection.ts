import { ChildSet } from '@splootcode/core/language/childset'
import { CursorMap } from './cursor_map'
import { EditBoxData } from './edit_box'
import { InsertBoxData } from './insert_box'
import { MultiselectDeleter } from './multiselect_deleter'
import { MultiselectFragmentCreator } from './multiselect_fragment_creator'
import { MultiselectTreeWalker } from './multiselect_tree_walker'
import { NODE_BLOCK_HEIGHT } from '../layout/layout_constants'
import { NodeBlock } from '../layout/rendered_node'
import {
  NodeCategory,
  getBlankFillForCategory,
  isNodeInCategory,
} from '@splootcode/core/language/node_category_registry'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedFragment } from '../layout/rendered_fragment'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SplootNode } from '@splootcode/core/language/node'
import { action, observable } from 'mobx'
import { adaptFragmentToPasteDestinationIfPossible } from '@splootcode/core/language/fragment_adapter'
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

  selectionStart: NodeCursor
  selectionEnd: NodeCursor

  @observable
  selectedListBlocks: Set<RenderedChildSetBlock>

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
    this.cursor = { lineIndex: 0, entryIndex: 0 }
  }

  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode
    this.updateRenderPositions()
  }

  updateRenderPositions() {
    this.cursorMap = new CursorMap()
    this.rootNode.calculateDimensions(-20, -NODE_BLOCK_HEIGHT, this)
    this.cursorMap.dedupdeAndSort()
  }

  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode
  }

  isMultiSelect() {
    return this.state === SelectionState.MultiNode
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

  copyCurrentSelection(): SplootFragment {
    if (this.isSingleNode()) {
      const selectedNode = this.selectionStart.selectedNode()
      const node = selectedNode.clone()
      return new SplootFragment([node], this.selectionStart.listBlock.childSet.nodeCategory)
    } else if (this.isMultiSelect()) {
      const fragmentWalker = new MultiselectFragmentCreator(this.selectionStart, this.selectionEnd)
      fragmentWalker.walkToEnd()
      return fragmentWalker.getFragment()
    }
    return null
  }

  @action
  placeCursor(listBlock: RenderedChildSetBlock, index: number, updateXY = true) {
    this.cursor = listBlock.getCursorPosition(this.cursorMap, index)
    this.placeCursorPosition(this.cursor, true, updateXY)
  }

  placeCursorPosition(position: CursorPosition, isCursor: boolean, updateXY = true) {
    if (isCursor) {
      this.setSelectionCursor(position)
      if (updateXY) {
        this.updateCursorXYToCursor()
      }
    } else {
      this.selectNodeAtPosition(position)
    }
  }

  getCurrentNodeCursors(): NodeCursor[] {
    if (this.isCursor()) {
      return this.cursorMap.getNodeCursorsForCursorPosition(this.cursor)
    }
    return []
  }

  getAutocompleteNodeCursors(): NodeCursor[] {
    if (this.isCursor()) {
      return this.cursorMap.getAutocompleteCursorsForCursorPosition(this.cursor)
    }
    return []
  }

  getCursorXYPosition(): [number, number] {
    if (this.isCursor() || this.isMultiSelect()) {
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
    } else if (this.state === SelectionState.MultiNode) {
      const deleteWalker = new MultiselectDeleter(this.selectionStart, this.selectionEnd)
      deleteWalker.walkToEnd()
      const deleteSets = deleteWalker.getDeletions()
      for (const deleteSet of deleteSets) {
        const node = deleteSet.node
        const parent = node.node.parent.node
        const listBlock = node.parentChildSet
        let index = node.index
        const deletedNode = listBlock.childSet.removeChild(index)
        if (node.leftBreadcrumbChildSet) {
          const newNodes = deletedNode.getChildrenToKeepOnDelete()
          newNodes.forEach((node) => {
            listBlock.childSet.insertNode(node, index)
            index++
          })
          this.placeCursor(listBlock, index)
        }
        parent.clean()
        for (const fragment of deleteSet.keep) {
          this.insertFragment(fragment, false)
        }
      }
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
        this.state = SelectionState.Editing
        this.updateRenderPositions()
      }
    }
  }

  @action
  updatePropertyEdit(newValue: string): string {
    if (this.isEditingSingleNode()) {
      const sanitisedValue =
        this.selectionStart.listBlock.nodes[this.selectionStart.index].node.setEditablePropertyValue(newValue)
      this.updateRenderPositions()
      return sanitisedValue
    }
    return ''
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
    const lineStartCursors = this.cursorMap.getLineStartCursorsForCursorPosition(this.cursor)

    for (const startCursor of lineStartCursors) {
      const unindentTarget = startCursor.listBlock.getUnindentTarget(startCursor.index)
      if (unindentTarget) {
        if (startCursor.listBlock.allowDelete()) {
          startCursor.listBlock.childSet.removeChild(startCursor.index)
        }
        const newlineNode = getBlankFillForCategory(unindentTarget.listBlock.childSet.nodeCategory)
        unindentTarget.listBlock.childSet.insertNode(newlineNode, unindentTarget.index)
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

    const lineStartCursor = this.cursorMap.getLineStartCursorsForCursorPosition(this.cursor)
    if (lineStartCursor.length !== 0) {
      // Is start of line cursor. Insert empty node at the line cursor position.
      // There can be multiple newline cursors - take the first one.
      const insertCursor = lineStartCursor[0]
      const newlineNode = getBlankFillForCategory(insertCursor.listBlock.childSet.nodeCategory)
      this.insertNode(insertCursor.listBlock, insertCursor.index, newlineNode)
      this.moveCursorDown(false)
      return
    }

    const lineEndCursor = this.cursorMap.getLineEndCursorsForCursorPosition(this.cursor)
    if (lineEndCursor.length !== 0) {
      const insertCursor = lineEndCursor[0]
      const newlineNode = getBlankFillForCategory(insertCursor.listBlock.childSet.nodeCategory)
      this.insertNode(insertCursor.listBlock, insertCursor.index, newlineNode)
      return
    }
  }

  @action
  backspace() {
    if (this.isSingleNode()) {
      this.deleteSelectedNode()
      return
    }

    const deleteCursor = this.cursor
    // If there's a line cursor start, and the preceeding line is empty, delete that line (can be tree child)
    const lineStartCursors = this.cursorMap.getLineStartCursorsForCursorPosition(this.cursor)

    for (const startCursor of lineStartCursors) {
      if (!startCursor.listBlock.allowDelete()) {
        continue
      }
      const unindentTarget = startCursor.listBlock.getUnindentTarget(startCursor.index)
      if (unindentTarget) {
        startCursor.listBlock.childSet.removeChild(startCursor.index)
        const newlineNode = getBlankFillForCategory(unindentTarget.listBlock.childSet.nodeCategory)
        unindentTarget.listBlock.childSet.insertNode(newlineNode, unindentTarget.index)
        return
      }

      if (startCursor.index !== 0 && startCursor.listBlock.allowDelete()) {
        const prevLine = startCursor.listBlock.nodes[startCursor.index - 1]
        if (prevLine.node.isEmpty()) {
          startCursor.listBlock.childSet.removeChild(startCursor.index - 1)
          return
        }
      }
      if (
        startCursor.index < startCursor.listBlock.nodes.length &&
        startCursor.listBlock.nodes[startCursor.index].node.isEmpty() &&
        startCursor.listBlock.allowDelete()
      ) {
        const [leftCursor, isCursor] = this.cursorMap.getCursorLeftOfPosition(deleteCursor)
        startCursor.listBlock.childSet.removeChild(startCursor.index)
        this.placeCursorPosition(leftCursor, isCursor, true)
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

  insertFragment(fragment: SplootFragment, allowSingle = true) {
    if (this.isCursor()) {
      if (fragment.isSingle() && allowSingle) {
        this.insertNodeAtCurrentCursor(fragment.nodes[0])
        return
      }

      for (const cursor of this.getCurrentNodeCursors()) {
        const listBlock = cursor.listBlock
        let index = cursor.index

        const adaptedNodes = adaptFragmentToPasteDestinationIfPossible(fragment, listBlock.childSet, index)
        if (adaptedNodes !== null) {
          for (const node of adaptedNodes) {
            this.insertNode(listBlock, index, node)
            index++
          }
          this.placeCursor(listBlock, index, true)
          return
        }
      }
    } else if (this.isSingleNode() && fragment.isSingle()) {
      this.replaceOrWrapSelectedNode(fragment.nodes[0])
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
          // TODO: Better wrapping logic with new cursors
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
      this.setSelectionSingleNode(new NodeCursor(this.selectionStart.listBlock, this.selectionStart.index))
      this.updateRenderPositions()
    }
    if (this.state == SelectionState.Inserting) {
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate)
      this.updateRenderPositions()
    }
  }

  @action
  clearSelection() {
    this.editBox = null
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.state = SelectionState.Empty
    this.selectionStart = null
  }

  @action
  setSelectionSingleNode(nodeCursor: NodeCursor) {
    this.editBox = null
    if (this.selectionStart && this.selectionStart.listBlock !== nodeCursor.listBlock) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.selectionStart = nodeCursor
    this.clearSelectedListBlocks()
    nodeCursor.listBlock.selectedIndexStart = nodeCursor.index
    nodeCursor.listBlock.selectedIndexEnd = nodeCursor.index + 1
    nodeCursor.listBlock.selectionState = SelectionState.SingleNode
    this.state = SelectionState.SingleNode
  }

  @action
  setSelectionCursor(position: CursorPosition) {
    this.editBox = null
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
      this.selectionStart = null
    }
    this.clearSelectedListBlocks()
    this.cursor = position
    this.insertBox = new InsertBoxData(this.cursorMap.getCoordinates(position))
    this.state = SelectionState.Cursor
  }

  clearSelectedListBlocks() {
    if (this.selectedListBlocks) {
      this.selectedListBlocks.forEach((listBlock) => {
        listBlock.selectionState = SelectionState.Empty
      })
    }
  }

  selectNodeAtPosition(postition: CursorPosition) {
    this.cursor = postition
    const nodeCursor = this.cursorMap.getSingleNodeForCursorPosition(postition)
    this.setSelectionSingleNode(nodeCursor)
  }

  setSelectionMultiselect(start: NodeCursor, end: NodeCursor, cursor: CursorPosition, isCursor: boolean) {
    this.cursor = cursor
    if (!isCursor) {
      if (!start.greaterThan(end)) {
        end = end.listBlock.getNextCursorInOrAfterNodeEvenIfInvalid(end.index)
      } else {
        end = end.listBlock.getNextCursorInOrBeforeNodeEvenIfInvalid(end.index)
      }
    }
    const treeWalker = new MultiselectTreeWalker(start, end)
    treeWalker.walkToEnd()

    const newSelectedListBlocks = treeWalker.getSelectedListBlocks()
    if (this.selectedListBlocks) {
      for (const alreadySelectedBlock of this.selectedListBlocks) {
        if (!newSelectedListBlocks.has(alreadySelectedBlock)) {
          alreadySelectedBlock.selectionState = SelectionState.Empty
        }
      }
    }

    if (newSelectedListBlocks.size !== 0) {
      this.selectedListBlocks = newSelectedListBlocks
      this.state = SelectionState.MultiNode
      this.selectionStart = start
      this.selectionEnd = end
    }

    if (this.selectionStart.equals(this.selectionEnd)) {
      this.setSelectionCursor(this.cursor)
    }
  }

  updateMultiSelect(newPrimaryCursor: CursorPosition, isCursor: boolean) {
    const end = this.cursorMap.getMultiSelectCursorForCursorPosition(newPrimaryCursor)
    this.setSelectionMultiselect(this.selectionStart, end, newPrimaryCursor, isCursor)
  }

  startMultiSelect(cursorIsStart: boolean) {
    if (this.isSingleNode()) {
      const cursor = this.cursor
      const selectedNode = this.cursorMap.getSingleNodeForCursorPosition(this.cursor)
      const after = selectedNode.listBlock.getNextCursorInOrAfterNodeEvenIfInvalid(selectedNode.index)
      const before = selectedNode.listBlock.getNextCursorInOrBeforeNodeEvenIfInvalid(selectedNode.index)
      if (cursorIsStart) {
        this.setSelectionMultiselect(after, before, cursor, true)
      } else {
        this.setSelectionMultiselect(before, after, cursor, true)
      }
    } else if (!this.isMultiSelect()) {
      const start = this.cursorMap.getMultiSelectCursorForCursorPosition(this.cursor)
      this.selectionStart = start
      this.selectionEnd = start
      this.state = SelectionState.MultiNode
    }
  }

  @action
  editSelectionLeft() {
    this.startMultiSelect(true)
    let cursor = this.cursor
    while (true) {
      const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(cursor)
      if (!isCursor) {
        this.updateMultiSelect(nextCursor, isCursor)
        this.lastXCoordinate = x
        this.lastYCoordinate = y
        break
      }
      if (cursor.lineIndex === nextCursor.lineIndex && cursor.entryIndex === nextCursor.entryIndex) {
        break
      }
      cursor = nextCursor
    }
  }

  @action
  editSelectionRight() {
    this.startMultiSelect(false)
    let cursor = this.cursor
    while (true) {
      const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(cursor)
      if (!isCursor) {
        this.updateMultiSelect(nextCursor, isCursor)
        this.lastXCoordinate = x
        this.lastYCoordinate = y
        break
      }
      if (cursor.lineIndex === nextCursor.lineIndex && cursor.entryIndex === nextCursor.entryIndex) {
        break
      }
      cursor = nextCursor
    }
  }

  @action
  editSelectionDown() {
    this.startMultiSelect(false)
    const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorDownOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.updateMultiSelect(nextCursor, isCursor)

    this.lastXCoordinate = x
    this.lastYCoordinate = y
  }

  @action
  expandSelectionUp() {
    this.startMultiSelect(true)
    const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorUpOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.updateMultiSelect(nextCursor, isCursor)

    this.lastXCoordinate = x
    this.lastYCoordinate = y
  }

  @action
  moveCursorRight() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(this.cursor)

    this.lastXCoordinate = x
    this.lastYCoordinate = y

    this.placeCursorPosition(cursor, isCursor, false)
  }

  @action
  moveCursorLeft() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(this.cursor)
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    this.placeCursorPosition(cursor, isCursor, false)
  }

  @action
  moveCursorUp(shiftKey: boolean) {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorUpOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y

    if (shiftKey) {
      this.startMultiSelect(true)
      this.updateMultiSelect(cursor, isCursor)
    } else {
      this.placeCursorPosition(cursor, isCursor, false)
    }
  }

  @action
  moveCursorDown(shiftKey: boolean) {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorDownOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    if (shiftKey) {
      this.startMultiSelect(false)
      this.updateMultiSelect(cursor, isCursor)
    } else {
      this.placeCursorPosition(cursor, isCursor, false)
    }
  }

  moveCursorToStartOfLine(shiftKey: boolean) {
    const [cursor, isCursor, x] = this.cursorMap.getCursorAtStartOfLine(this.cursor)
    this.lastXCoordinate = x
    if (shiftKey) {
      this.startMultiSelect(true)
      this.updateMultiSelect(cursor, isCursor)
    } else {
      this.placeCursorPosition(cursor, isCursor, false)
    }
  }

  moveCursorToEndOfLine(shiftKey: boolean) {
    const [cursor, isCursor, x] = this.cursorMap.getCursorAtEndOfLine(this.cursor)
    this.lastXCoordinate = x
    if (shiftKey) {
      this.startMultiSelect(false)
      this.updateMultiSelect(cursor, isCursor)
    } else {
      this.placeCursorPosition(cursor, isCursor, false)
    }
  }

  moveCursorToNextInsert(backwards: boolean) {
    let [cursor, isCursor, x, y] = [this.cursor, false, 0, 0]
    if (backwards) {
      ;[cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(cursor)
      while (!isCursor) {
        ;[cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(cursor)
      }
    } else {
      ;[cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(cursor)
      while (!isCursor) {
        ;[cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(cursor)
      }
    }

    this.lastXCoordinate = x
    this.lastYCoordinate = y
    this.placeCursorPosition(cursor, isCursor, false)
  }

  startDrag(fragment: RenderedFragment, offsetX: number, offestY: number) {
    this.dragState = {
      node: fragment,
      offsetX: offsetX,
      offsetY: offestY,
    }
  }

  handleClick(x: number, y: number, shiftKey: boolean) {
    const [cursor, isCursor] = this.cursorMap.getCursorPositionByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x

    if (shiftKey) {
      const cursorAtStart =
        this.cursor &&
        (this.cursor.lineIndex > cursor.lineIndex
          ? true
          : this.cursor.lineIndex === cursor.lineIndex && this.cursor.entryIndex > cursor.entryIndex)
      this.startMultiSelect(cursorAtStart)
      this.updateMultiSelect(cursor, isCursor)
    } else {
      if (isCursor) {
        this.placeCursorPosition(cursor, isCursor, false)
      } else {
        if (this.isSelectedNodeAtPosition(cursor)) {
          this.startEditAtCurrentCursor()
        } else {
          this.selectNodeAtPosition(cursor)
        }
      }
    }
  }

  placeCursorByXYCoordinate(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorPositionByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
    this.placeCursorPosition(cursor, isCursor, false)
  }

  endDrag() {
    this.dragState = null
  }
}

export class NodeCursor {
  listBlock: RenderedChildSetBlock
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

  increment(): NodeCursor {
    return new NodeCursor(this.listBlock, this.index + 1)
  }

  equals(other: NodeCursor): boolean {
    return this.listBlock === other.listBlock && this.index === other.index
  }

  getChainToRoot(): number[] {
    return this.listBlock.getChainToRoot().concat(this.index)
  }

  greaterThan(other: NodeCursor): boolean {
    const thisChain = this.getChainToRoot()
    const otherChain = other.getChainToRoot()
    let i = 0
    while (i < thisChain.length && i < otherChain.length) {
      if (thisChain[i] > otherChain[i]) {
        return true
      } else if (thisChain[i] < otherChain[i]) {
        return false
      }
      i++
    }
    if (thisChain.length > otherChain.length) {
      return thisChain[otherChain.length] >= 0
    }
    return false
  }
}
