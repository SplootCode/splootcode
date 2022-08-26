import { ChildSet } from '@splootcode/core/language/childset'
import { CursorMap } from './cursor_map'
import { EditBoxData } from './edit_box'
import { InsertBoxData } from './insert_box'
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
import { action, computed, observable } from 'mobx'
import {
  adaptNodeToPasteDestination,
  deserializeNode,
  isAdaptableToPasteDesintation,
} from '@splootcode/core/language/type_registry'

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
  selectedListBlocks: Set<RenderedChildSetBlock>
  multiSelectCursors: [NodeCursor, NodeCursor]

  @observable
  cursor: CursorPosition

  @observable
  secondaryCursor: CursorPosition

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
    this.rootNode.calculateDimensions(-20, -NODE_BLOCK_HEIGHT, this)
    this.cursorMap.dedupdeAndSort()
  }

  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting
  }

  isMultiSelect() {
    return this.state === SelectionState.MultiNode
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode
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
      this.moveCursorDown()
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

  insertFragmentAtCurrentCursor(fragment: SplootFragment) {
    if (this.isCursor()) {
      if (fragment.isSingle()) {
        this.insertNodeAtCurrentCursor(fragment.nodes[0])
        return
      }

      for (const cursor of this.getCurrentNodeCursors()) {
        const destCategory = cursor.listBlock.getPasteDestinationCategory()
        const valid = fragment.nodes.filter((node) => isAdaptableToPasteDesintation(node, destCategory))
        if (fragment.nodes.length == valid.length) {
          const adaptedNodes = fragment.nodes.map((node) => adaptNodeToPasteDestination(node, destCategory))
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

  clearSelectedListBlocks() {
    if (this.selectedListBlocks) {
      this.selectedListBlocks.forEach((listBlock) => {
        listBlock.selectionState = SelectionState.Empty
      })
    }
  }

  @action
  setSelectionEmpty() {
    this.editBox = null
    if (this.selectionStart) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.clearSelectedListBlocks()
    this.state = SelectionState.Empty
    this.selectionStart = null
  }

  selectNodeAtPosition(postition: CursorPosition) {
    this.cursor = postition
    const nodeCursor = this.cursorMap.getSingleNodeForCursorPosition(postition)
    this.setSelectionSingleNode(nodeCursor)
  }

  @action
  setSelectionSingleNode(nodeCursor: NodeCursor) {
    this.editBox = null
    if (this.selectionStart && this.selectionStart.listBlock !== nodeCursor.listBlock) {
      this.selectionStart.listBlock.selectionState = SelectionState.Empty
    }
    this.clearSelectedListBlocks()
    this.selectionStart = nodeCursor
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

  getSelectedFragment(): SplootFragment {
    if (this.isSingleNode()) {
      const node = deserializeNode(this.selectedNode.shallowSerialize())
      return new SplootFragment([node], this.selectionStart.listBlock.childSet.nodeCategory)
    } else if (this.isMultiSelect()) {
      const [realStart, end] = this.multiSelectCursors
      const fragmentWalker = new MultiselectFragmentCreator(realStart, end)
      fragmentWalker.walkToEnd()
      console.log(fragmentWalker.getFragment())
      return fragmentWalker.getFragment()
    }
  }

  setSelectionMultiselect(start: NodeCursor, end: NodeCursor) {
    // Get real start - so that start is same level or higher than end.
    const endAncestors: Set<RenderedChildSetBlock> = new Set()
    let current = end.listBlock
    while (current) {
      endAncestors.add(current)
      const parentNode = current.parentRef.node
      current = parentNode.parentChildSet
    }

    let realStart = start
    while (true) {
      if (endAncestors.has(realStart.listBlock)) {
        break
      }
      const parentNode = realStart.listBlock.parentRef.node
      if (!parentNode) {
        break
      }
      realStart = new NodeCursor(parentNode.parentChildSet, parentNode.index)
    }

    const treeWalker = new MultiselectTreeWalker(realStart, end)
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
      this.multiSelectCursors = [realStart, end]
    } else {
      this.setSelectionCursor(this.cursor)
    }
  }

  updateMultiSelect(newPrimaryCursor: CursorPosition, isCursor: boolean) {
    // Figure out which is first (it can go either way)
    if (!this.secondaryCursor) {
      this.secondaryCursor = this.cursor
    }
    let start = this.secondaryCursor
    let end = newPrimaryCursor
    if (
      newPrimaryCursor.lineIndex < this.secondaryCursor.lineIndex ||
      (newPrimaryCursor.lineIndex === this.secondaryCursor.lineIndex &&
        newPrimaryCursor.entryIndex < this.secondaryCursor.entryIndex)
    ) {
      start = newPrimaryCursor
      end = this.secondaryCursor
    }

    // Get node set between start and end
    const startCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(start, false)
    const endCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(end, false)
    this.cursor = newPrimaryCursor
    this.setSelectionMultiselect(startCursor, endCursor)
  }

  @action
  expandSelectionLeft() {
    if (this.isCursor() || this.isSingleNode()) {
      this.secondaryCursor = this.cursor
    }
    const currentNodeCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(this.cursor)
    let cursor = this.cursor
    while (true) {
      const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfPosition(cursor)
      const nodeCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(nextCursor)
      if (nodeCursor.listBlock !== currentNodeCursor.listBlock || nodeCursor.index !== currentNodeCursor.index) {
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
  expandSelectionRight() {
    if (this.isCursor() || this.isSingleNode()) {
      this.secondaryCursor = this.cursor
    }
    let cursor = this.cursor
    const currentNodeCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(this.cursor)

    while (true) {
      const [nextCursor, isCursor, x, y] = this.cursorMap.getCursorRightOfPosition(cursor)
      const nodeCursor = this.cursorMap.getMultiSelectCursorForCursorPosition(nextCursor)
      if (nodeCursor.listBlock !== currentNodeCursor.listBlock || nodeCursor.index !== currentNodeCursor.index) {
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
  expandSelectionDown() {
    if (this.isCursor() || this.isSingleNode()) {
      this.secondaryCursor = this.cursor
    }
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
    if (this.isCursor() || this.isSingleNode()) {
      this.secondaryCursor = this.cursor
    }
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
  moveCursorUp() {
    const [cursor, isCursor, x, y] = this.cursorMap.getCursorUpOfPosition(
      this.lastXCoordinate,
      this.lastYCoordinate,
      this.cursor
    )
    this.lastXCoordinate = x
    this.lastYCoordinate = y
    this.placeCursorPosition(cursor, isCursor, false)
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
    this.placeCursorPosition(cursor, isCursor, false)
  }

  moveCursorToStartOfLine() {
    const [cursor, isCursor, x] = this.cursorMap.getCursorAtStartOfLine(this.cursor)
    this.lastXCoordinate = x
    this.placeCursorPosition(cursor, isCursor, false)
  }

  moveCursorToEndOfLine() {
    const [cursor, isCursor, x] = this.cursorMap.getCursorAtEndOfLine(this.cursor)
    this.lastXCoordinate = x
    this.placeCursorPosition(cursor, isCursor, false)
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

  handleClick(x: number, y: number) {
    const [cursor, isCursor] = this.cursorMap.getCursorPositionByCoordinate(x, y)
    this.lastYCoordinate = y
    this.lastXCoordinate = x
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

  isLastIndex(): boolean {
    return this.index >= this.listBlock.nodes.length - 1
  }

  getNode(): NodeBlock {
    return this.listBlock.nodes[this.index]
  }

  increment(): NodeCursor {
    return new NodeCursor(this.listBlock, this.index + 1)
  }

  selectedNode() {
    if (!this.listBlock) {
      return null
    }
    return this.listBlock.childSet.getChildren()[this.index]
  }
}
