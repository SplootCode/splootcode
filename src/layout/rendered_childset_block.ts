import { SplootNode } from "../language/node";
import { ChildSet, ChildSetType } from "../language/childset";
import { LayoutComponent, LayoutComponentType } from "../language/type_registry";
import { ChildSetObserver } from "../language/observers";
import { ChildSetMutation, ChildSetMutationType } from "../language/mutations/child_set_mutations";
import { observable, action } from "mobx";
import { NodeSelectionState, NodeSelection, SelectionState, NodeCursor } from "../context/selection";
import { NODE_BLOCK_HEIGHT, NodeBlock, RenderedParentRef } from "./rendered_node";
import { SPLOOT_EXPRESSION } from "../language/types/expression";

const EXPRESSION_TOKEN_SPACING = 6;
const ROW_SPACING = 6;

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 * 
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 * 
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextWidth(text, font) {
  // re-use canvas object for better performance
  var canvas = getTextWidth['canvas'] || (getTextWidth['canvas'] = document.createElement("canvas"));
  var context = canvas.getContext("2d");
  context.font = font;
  var metrics = context.measureText(text);
  return metrics.width;
}

function labelStringWidth(s: string) {
  return getTextWidth(s, "8pt 'Source Sans Pro'");
}

export function stringWidth(s: string) {
  // return s.length * 8;
  return getTextWidth(s, "11pt 'Source Sans Pro'");
}

export function getInsertBoxWidth(s: string) : number {
  return Math.max(stringWidth(s) + 6, 30);
}

export class RenderedChildSetBlock implements ChildSetObserver {
  parentRef: RenderedParentRef;
  selection: NodeSelection;
  childSet: ChildSet;
  @observable
  nodes: NodeBlock[];
  @observable
  selectedIndex: number;
  @observable
  selectionState: SelectionState;
  @observable
  componentType: LayoutComponentType;
  @observable
  isLastInlineComponent: boolean;
  childSetTreeLabels: string[];

  @observable
  x: number;
  @observable
  y: number;
  @observable
  width: number;
  @observable
  height: number;

  constructor(parentRef: RenderedParentRef, selection: NodeSelection, childSet: ChildSet, layoutComponent: LayoutComponent, isLastInlineComponent: boolean) {
    this.parentRef = parentRef;
    this.selection = selection;
    this.nodes = [];
    this.childSet = childSet;
    if (selection) {
      // Using selection as a proxy for whether this is a real node or a autcomplete
      this.childSet.registerObserver(this);
    }
    this.componentType = layoutComponent.type;
    this.width = 0;
    this.height = 0;
    this.isLastInlineComponent = isLastInlineComponent;
    this.childSetTreeLabels = [];
    if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
        this.childSetTreeLabels = layoutComponent.metadata;
      }
    }

    this.childSet.children.forEach((childNode: SplootNode, i: number) => {
      let isInlineChild = this.componentType === LayoutComponentType.CHILD_SET_INLINE;
      let childNodeBlock = new NodeBlock(this, childNode, selection, i, isInlineChild);
      this.nodes.push(childNodeBlock);
    });
  }

  calculateDimensions(x: number, y: number, selection: NodeSelection) {
    this.width = 0;
    this.height = 0;
    this.x = x;
    this.y = y;
    let insertIndex = -1; // No insert node here.
    if (selection?.cursor?.listBlock === this && selection?.state === SelectionState.Inserting) {
      insertIndex = selection.cursor.index;
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_INLINE) {
      let leftPos = x;
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
          this.width += boxWidth;
          leftPos += boxWidth;
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection);
        leftPos += childNodeBlock.rowWidth;
        this.width += childNodeBlock.rowWidth;
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight);
      })
      if (this.nodes.length === insertIndex) {
        let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
        this.width += boxWidth;
        leftPos += boxWidth;
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
      let leftPos = x;
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
          this.width += boxWidth;
          leftPos += boxWidth;
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection);
        leftPos += childNodeBlock.rowWidth;
        this.width += childNodeBlock.rowWidth;
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight);
      })
      if (this.nodes.length === insertIndex) {
        let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
        this.width += boxWidth;
        leftPos += boxWidth;
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      let labels = this.childSetTreeLabels;
      let maxLabelWidth = Math.max(0, ...labels.map(label => labelStringWidth(label)));
      let topPos = this.isLastInlineComponent ? y : y + NODE_BLOCK_HEIGHT + ROW_SPACING;
      this.height = this.isLastInlineComponent ? 0 : NODE_BLOCK_HEIGHT + ROW_SPACING;
      let indent = this.isLastInlineComponent ? 48 : 18;
      indent += maxLabelWidth;
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING;
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING;
          this.width = Math.max(this.width, boxWidth);
        }
        childNodeBlock.calculateDimensions(x + indent, topPos, selection);
        topPos += childNodeBlock.rowHeight + ROW_SPACING;
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING;
        this.width = Math.max(this.width, childNodeBlock.blockWidth + childNodeBlock.rowWidth + indent); 
      });
      if (this.nodes.length === insertIndex) {
        let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING;
        this.width = Math.max(this.width, boxWidth);
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BLOCK) {
      let topPos = y + ROW_SPACING;
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING;
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING;
          this.width = Math.max(this.width, boxWidth);
        }
        childNodeBlock.calculateDimensions(x, topPos, selection);
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING;
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING;
        this.width = Math.max(this.width, childNodeBlock.rowWidth);
      });
      if (this.nodes.length === insertIndex) {
        let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING;
        this.width = Math.max(this.width, boxWidth);
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
      let leftPos = x;
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
          this.width += boxWidth;
          leftPos += boxWidth;
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection);
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING;
        this.width += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING;
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight);
      })
      if (this.nodes.length === insertIndex) {
        let boxWidth = getInsertBoxWidth(selection.insertBox.contents);
        this.width += boxWidth;
        leftPos += boxWidth;
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      let leftPos = x + 16;
      this.nodes.forEach((childNodeBlock: NodeBlock) => {
        childNodeBlock.calculateDimensions(leftPos, y, selection);
        leftPos += childNodeBlock.rowWidth;
        this.width += childNodeBlock.rowWidth;
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight);
      })
      this.width += 22; // Space for brackets
    }
    if (this.componentType === LayoutComponentType.CHILD_SET_BLOCK) {
      this.height += 20;
    }
  }

  getInsertCoordinates(insertIndex: number) : number[] {
    if (this.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
      let leftPos = this.x;
      for (let i = 0; i < this.nodes.length; i++) {
        let childNodeBlock = this.nodes[i];
        if (i === insertIndex) {
          return [leftPos, this.y];
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING;
      }
      if (this.nodes.length === insertIndex) {
        return [leftPos, this.y];
      }
      return [this.x + this.width, this.y]
    } else if (this.componentType === LayoutComponentType.CHILD_SET_INLINE) {
      let leftPos = this.x;
      for (let i = 0; i < this.nodes.length; i++) {
        let childNodeBlock = this.nodes[i];
        if (i === insertIndex) {
          return [leftPos, this.y];
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING;
      }
      if (this.nodes.length === insertIndex) {
        return [leftPos, this.y];
      }
      return [this.x + this.width, this.y]
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BLOCK) {
      let topPos = this.y + ROW_SPACING;
      for (let i = 0; i < this.nodes.length; i++) {
        let childNodeBlock = this.nodes[i];
        if (i === insertIndex) {
          return [this.x, topPos];
        }
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING;
      }
      if (this.nodes.length === insertIndex) {
        return [this.x, topPos];
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      let topPos = this.isLastInlineComponent ? this.y : this.y + NODE_BLOCK_HEIGHT + ROW_SPACING;
      let indent = this.isLastInlineComponent ? 40 : 18;
      for (let i = 0; i < this.nodes.length; i++) {
        let childNodeBlock = this.nodes[i];
        if (i === insertIndex) {
          return [this.x + indent, topPos];
        }
        topPos += childNodeBlock.rowHeight + ROW_SPACING;        
      }
      if (this.nodes.length === insertIndex) {
        return [this.x + indent, topPos];
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      // Only ever one child, so this one is easier to calculate.
      return [this.x + 14, this.y];
    }
    console.warn('Insert position not implemented for LayoutComponentType', this.componentType)
    return [100, 100];
  }

  @observable
  getChildSelectionState(idx: number) : NodeSelectionState {
    if (this.selectionState === SelectionState.Empty || this.selectedIndex !== idx) {
      return NodeSelectionState.UNSELECTED;
    }
    if (this.selectionState === SelectionState.SingleNode) {
      return NodeSelectionState.SELECTED;
    }
    if (this.selectionState === SelectionState.Editing) {
      return NodeSelectionState.EDITING;
    }
    return NodeSelectionState.UNSELECTED;
  }

  @observable
  allowInsert() : boolean {
    return this.childSet.type === ChildSetType.Many || (this.childSet.getCount() === 0)
  }

  @observable
  isInsert(idx: number) : boolean {
    return this.selectedIndex === idx && this.selectionState === SelectionState.Inserting;
  }

  renumberChildren() {
    this.nodes.forEach((nodeBlock: NodeBlock, index: number) => {
      nodeBlock.index = index;
    });
  }

  getNextChildInsert() : NodeCursor {
    if (this.allowInsert()) {
      return new NodeCursor(this, 0);
    }
    for (let node of this.nodes) {
      let cursor = node.getNextChildInsertCursor();
      if (cursor) {
        return cursor;
      }
    }
    return null;
  }

  getNextInsertCursorInOrAfterNode(index: number) : NodeCursor {
    let nextChildCursor = this.nodes[index].getNextChildInsertCursor();
    if (nextChildCursor) {
      return nextChildCursor;
    } else if (this.allowInsert()) {
      return new NodeCursor(this, index + 1);
    } else {
      nextChildCursor = this.parentRef.node.getNextInsertAfterThisNode()
      if (nextChildCursor) {
        return new NodeCursor(nextChildCursor.listBlock, nextChildCursor.index);
      }
    }
    return null;
  }

  @action
  handleChildSetMutation(mutation: ChildSetMutation): void {
    if (mutation.type === ChildSetMutationType.INSERT) {
      mutation.nodes.forEach((node: SplootNode, idx: number) => {
        let isInlineChild = this.componentType === LayoutComponentType.CHILD_SET_INLINE;
        let nodeBlock = new NodeBlock(this, node, this.selection, mutation.index + idx, isInlineChild);
        this.nodes.splice(mutation.index + idx, 0, nodeBlock);
      });
      this.renumberChildren();
      this.selection.updateRenderPositions();
      if (mutation.nodes.length === 1) {
        let insertedNode = this.nodes[mutation.index];
        if (insertedNode.node.type === SPLOOT_EXPRESSION && insertedNode.renderedChildSets['tokens'].nodes.length === 1) {
          // The inserted not was an autogenerated expression when inserting a single token.
          // Treat the first inserted node like the only inserted node.
          let cursor = insertedNode.renderedChildSets['tokens'].getNextInsertCursorInOrAfterNode(0);
          this.selection.placeCursor(cursor.listBlock, cursor.index);
        } else {
          let nextChildCursor = this.getNextInsertCursorInOrAfterNode(mutation.index);
          if (nextChildCursor) {
            this.selection.placeCursor(nextChildCursor.listBlock, nextChildCursor.index);
          }
        }
      }
    } else if (mutation.type === ChildSetMutationType.DELETE) {
      this.nodes.splice(mutation.index, 1);
      this.renumberChildren();
      this.selection.placeCursor(this, mutation.index);
    }
  }
}