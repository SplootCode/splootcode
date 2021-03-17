
import { SplootNode } from "../language/node";
import { action, observable, computed } from "mobx";
import { RenderedChildSetBlock } from "../layout/rendered_childset_block";
import { NodeBlock } from "../layout/rendered_node";
import { InsertBoxData } from "./insert_box";
import { NodeCategory } from "../language/node_category_registry";
import { SplootExpression } from "../language/types/js/expression";

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

export class NodeSelection {
  rootNode: NodeBlock;
  @observable
  cursor: NodeCursor;
  @observable
  state: SelectionState;
  @observable
  insertBox: InsertBoxData;

  constructor() {
    this.rootNode = null;
    this.cursor = null;
    this.insertBox = null;
    this.state = SelectionState.Empty;
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
    this.rootNode.calculateDimensions(-10, -30, this);
  }

  @observable
  isCursor() {
    return this.state === SelectionState.Cursor || this.state === SelectionState.Inserting;
  }

  isSingleNode() {
    return this.state === SelectionState.Editing || this.state === SelectionState.SingleNode;
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
  placeCursor(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit();
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.cursor = new NodeCursor(listBlock, index);
    listBlock.selectedIndex = index;
    listBlock.selectionState = SelectionState.Cursor;
    this.insertBox = new InsertBoxData(listBlock.getInsertCoordinates(index));
    this.state = SelectionState.Cursor;
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
    }
  }

  @action
  startInsertAtCurrentCursor() {
    this.state = SelectionState.Inserting;
    this.updateRenderPositions();
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
    if (this.state === SelectionState.Editing || this.state == SelectionState.Inserting) {
      this.state = SelectionState.SingleNode;
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
  editNodeByIndex(listBlock: RenderedChildSetBlock, index: number) {
    this.exitEdit();
    if (this.cursor) {
      this.cursor.listBlock.selectionState = SelectionState.Empty;
    }
    this.selectNodeByIndex(listBlock, index);
    listBlock.selectedIndex = index;
    listBlock.selectionState = SelectionState.Editing;
    this.setState(SelectionState.Editing);
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