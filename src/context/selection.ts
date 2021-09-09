
import { action, computed, observable } from "mobx"
import { SplootNode } from "../language/node"
import { NodeCategory } from "../language/node_category_registry"
import { SplootExpression } from "../language/types/js/expression"
import { RenderedChildSetBlock } from "../layout/rendered_childset_block"
import { NodeBlock } from "../layout/rendered_node"
import { CursorMap } from "./cursor_map"
import { EditBoxData } from "./edit_box"
import { InsertBoxData } from "./insert_box"

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
  node: NodeBlock,
  offsetX: number,
  offsetY: number,
}

export class NodeSelection {
  cursorMap: CursorMap;
  rootNode: NodeBlock;
  @observable
  cursor: NodeCursor;
  @observable
  state: SelectionState;
  @observable
  insertBox: InsertBoxData;
  @observable
  editBox: EditBoxData;

  @observable
  dragState: DragState | null;

  lastXCoordinate: number;
  lastYCoordinate: number;

  constructor() {
    this.rootNode = null;
    this.cursorMap = new CursorMap();
    this.cursor = null;
    this.insertBox = null;
    this.editBox = null;
    this.state = SelectionState.Empty;
    this.dragState = null;
    this.lastXCoordinate = 0;
    this.lastYCoordinate = 0;
  }

  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode;
    this.updateRenderPositions();
  }

  @computed get selectedNode() {
    if (!this.cursor || !this.state) {
      return null;
    }
    return this.cursor.selectedNode();
  }

  updateRenderPositions() {
    this.cursorMap = new CursorMap();
    this.rootNode.calculateDimensions(-10, -20, this);
  }

  @observable
  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting;
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode;
  }

  @observable
  isEditingSingleNode() {
    return this.state === SelectionState.Editing;
  }

  @observable
  getStateByIndex(index: number) {
    if (!this.cursor || !this.isSingleNode() || this.cursor.index !== index) {
      return NodeSelectionState.UNSELECTED;
    }
    if (this.state === SelectionState.Editing) {
      return NodeSelectionState.EDITING;
    }
    return NodeSelectionState.SELECTED;
  }

  @observable
  getState(node: SplootNode) {
    if (!this.isSelected(node)) {
      return NodeSelectionState.UNSELECTED;
    }
    if (this.state === SelectionState.Editing) {
      return NodeSelectionState.EDITING;
    }
    return NodeSelectionState.SELECTED;
  }

  @observable
  isSelected(node: SplootNode) {
    if (!this.cursor || this.isCursor()) {
      return false;
    }
    return node === this.selectedNode;
  }

  @observable
  isEditing(node: SplootNode) {
    return this.isSelected(node) && this.state === SelectionState.Editing;
  }

  @action
  placeCursor(listBlock: RenderedChildSetBlock, index: number, updateXY: boolean = true) {
    this.exitEdit();
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.cursor = new NodeCursor(listBlock, index);
    listBlock.selectedIndex = index;
    listBlock.selectionState = SelectionState.Cursor;
    this.insertBox = new InsertBoxData(listBlock.getInsertCoordinates(index));
    this.state = SelectionState.Cursor;
    if (updateXY) {
      this.updateCursorXYToCursor();
    }
  }

  @action
  deleteSelectedNode() {
    if (this.state === SelectionState.SingleNode) {
      this.exitEdit();
      if (this.cursor) {
        this.cursor.listBlock.selectionState = SelectionState.Empty;
      }
      let listBlock = this.cursor.listBlock;
      listBlock.childSet.removeChild(this.cursor.index);
      // Trigger a clean from the parent upward.
      listBlock.parentRef.node.node.clean();
      this.updateRenderPositions();
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate);
    }
  }

  @action
  startInsertAtCurrentCursor() {
    this.state = SelectionState.Inserting;
    this.updateRenderPositions();
  }

  @action
  startEditAtCurrentCursor() {
    if (this.isSingleNode()) {
      const index = this.cursor.index;
      // Return null if not editable node.
      this.editBox = this.cursor.listBlock.getEditData(index)
      if (this.editBox !== null) {
        this.cursor.listBlock.selectionState = SelectionState.Editing;
        this.setState(SelectionState.Editing);
        this.updateRenderPositions();
      }
    }
  }

  @action
  updatePropertyEdit(newValue: string) {
    if (this.isEditingSingleNode()) {
      const property = this.editBox.property;
      this.cursor.listBlock.nodes[this.cursor.index].node.setPropertyFromString(property, newValue);
      this.updateRenderPositions();
    }
  }

  updateCursorXYToCursor() {
    const cursor = this.cursor;
    let [x, y] = cursor.listBlock.getInsertCoordinates(cursor.index, true);
    this.lastXCoordinate = x - 2;
    this.lastYCoordinate = y;
  }

  @action
  moveCursorToNextInsert() {
    if (this.cursor) {
      let newCursor = this.cursor.listBlock.getNextInsertCursorInOrAfterNode(this.cursor.index);
      if (newCursor) {
        this.placeCursor(newCursor.listBlock, newCursor.index);
      }
    } else {
      // Use root node instead
    }
  }

  @action
  insertNewline() {
    let insertCursor = this.cursor.listBlock.getNewLineInsertPosition(this.cursor.index);
    if (insertCursor !== null) {
      this.placeCursor(insertCursor.listBlock, insertCursor.index, false);
      this.startInsertAtCurrentCursor();
    }
  }

  @action
  unindentCursor() {
    let parent = this.cursor.listBlock.parentRef.node;
    if (parent !== null && parent.parentChildSet !== null) {
      let insertCursor = parent.parentChildSet.getNewLineInsertPosition(parent.index + 1);
      if (insertCursor !== null) {
        this.placeCursor(insertCursor.listBlock, insertCursor.index, false);
        this.startInsertAtCurrentCursor();
      }
    }
  }

  @action
  startInsertNode(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit();
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.cursor = new NodeCursor(listBlock, index);
    listBlock.selectedIndex = index;
    listBlock.selectionState = SelectionState.Inserting;
    this.state = SelectionState.Inserting;
    this.insertBox = new InsertBoxData(listBlock.getInsertCoordinates(index));
    this.updateRenderPositions();
  }

  @action
  insertNode(listBlock: RenderedChildSetBlock, index: number, node: SplootNode) {
    // Insert node will also update the render positions.
    listBlock.childSet.insertNode(node, index);
    // Trigger a clean from the parent upward.
    listBlock.parentRef.node.node.clean();
  }

  insertNodeAtCurrentCursor(node: SplootNode) {
    if (this.isCursor()) {
      this.insertNode(this.cursor.listBlock, this.cursor.index, node);
    }
  }

  @action
  wrapNode(listBlock: RenderedChildSetBlock, index: number, node: SplootNode, childSetId: string) {
    // remove child at index
    let child = listBlock.childSet.removeChild(index);
    let childSet = node.getChildSet(childSetId)
    if (childSet.nodeCategory === NodeCategory.Expression) {
      (childSet.getChild(0) as SplootExpression).getTokenSet().addChild(child);
    } else {
      childSet.addChild(child);
    }
    // insert node at index.
    listBlock.childSet.insertNode(node, index);
  }

  @action
  exitEdit() {
    if (this.state === SelectionState.Editing) {
      this.editBox = null;
      this.setState(SelectionState.SingleNode);
      this.cursor.listBlock.selectionState = SelectionState.SingleNode;
      this.updateRenderPositions();
    }
    if (this.state == SelectionState.Inserting) {
      this.state = SelectionState.Cursor;
      this.placeCursorByXYCoordinate(this.lastXCoordinate, this.lastYCoordinate);
      this.updateRenderPositions();
    }
  }

  @action
  clearSelection() {
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.state = SelectionState.Empty;
    this.cursor = null;
  }

  setState(newState: SelectionState) {
    this.state = newState;
  }

  getPasteDestinationCategory() : NodeCategory {
    if (this.cursor) {
      return this.cursor.listBlock.childSet.nodeCategory;
    }
  }

  @action
  selectNodeByIndex(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit();
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.cursor = new NodeCursor(listBlock, index);
    listBlock.selectedIndex = index;
    listBlock.selectionState = SelectionState.SingleNode;
    this.setState(SelectionState.SingleNode);
  }

  @action
  moveCursorRight() {
    let [cursor, isCursor, x, y] = this.cursorMap.getCursorRightOfCoordinate(this.lastXCoordinate, this.lastYCoordinate);
    this.lastXCoordinate = x;
    this.lastYCoordinate = y;
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false);
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index);
    }
  }

  @action
  moveCursorLeft() {
    let [cursor, isCursor, x, y] = this.cursorMap.getCursorLeftOfCoordinate(this.lastXCoordinate, this.lastYCoordinate);
    this.lastXCoordinate = x;
    this.lastYCoordinate = y;
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false);
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index);
    }
  }

  @action
  moveCursorUp() {
    let [cursor, isCursor, x, y] = this.cursorMap.getCursorUpOfCoordinate(this.lastXCoordinate, this.lastYCoordinate);
    this.lastXCoordinate = x;
    this.lastYCoordinate = y;
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false);
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index);
    }
  }

  @action
  moveCursorDown() {
    let [cursor, isCursor, x, y] = this.cursorMap.getCursorDownOfCoordinate(this.lastXCoordinate, this.lastYCoordinate);
    this.lastXCoordinate = x;
    this.lastYCoordinate = y;
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false);
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index);
    }
  }

  startDrag(nodeBlock: NodeBlock, offsetX: number, offestY: number) {
    let tempNodeBlock = new NodeBlock(null, nodeBlock.node, null, 0, false);
    tempNodeBlock.calculateDimensions(0, 0, null);
    this.dragState = {
      node: tempNodeBlock,
      offsetX: offsetX,
      offsetY: offestY,
    }
  }

  placeCursorByXYCoordinate(x: number, y: number) {
    let [cursor, isCursor] = this.cursorMap.getCursorByCoordinate(x, y);
    this.lastYCoordinate = y;
    this.lastXCoordinate = x;
    if (isCursor) {
      this.placeCursor(cursor.listBlock, cursor.index, false);
    } else {
      this.selectNodeByIndex(cursor.listBlock, cursor.index);
    }
  }

  endDrag() {
    this.dragState = null;
  }
}

export class NodeCursor {
  @observable
  listBlock: RenderedChildSetBlock;
  @observable
  index: number;

  constructor(listBlock: RenderedChildSetBlock, index: number) {
    this.listBlock = listBlock;
    this.index = index;
  }

  selectedNode() {
    if (!this.listBlock) {
      return null;
    }
    return this.listBlock.childSet.getChildren()[this.index];
  }
}