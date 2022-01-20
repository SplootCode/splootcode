import { action, observable } from 'mobx'

import { ChildSet, ChildSetType } from '@splootcode/core/language/childset'
import { ChildSetMutation, ChildSetMutationType } from '@splootcode/core/language/mutations/child_set_mutations'
import { ChildSetObserver } from '@splootcode/core/language/observers'
import { EditBoxData } from '../context/edit_box'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NodeBlock, RenderedParentRef } from './rendered_node'
import { NodeCursor, NodeSelection, NodeSelectionState, SelectionState } from '../context/selection'
import { SplootNode } from '@splootcode/core/language/node'

const EXPRESSION_TOKEN_SPACING = 6
const ROW_SPACING = 6

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextWidth(text: string, font: string) {
  // re-use canvas object for better performance
  const canvas = getTextWidth['canvas'] || (getTextWidth['canvas'] = document.createElement('canvas'))
  const context = canvas.getContext('2d')
  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}

function labelStringWidth(s: string) {
  return getTextWidth(s, "9pt 'Source Sans Pro'")
}

export function stringWidth(s: string) {
  return getTextWidth(s, "11pt 'Source Sans Pro'")
}

export function getInsertBoxWidth(s: string): number {
  return Math.max(stringWidth(s) + 6, 30)
}

export class RenderedChildSetBlock implements ChildSetObserver {
  parentRef: RenderedParentRef
  selection: NodeSelection
  childSet: ChildSet
  @observable
  nodes: NodeBlock[]
  @observable
  selectedIndex: number
  @observable
  selectionState: SelectionState
  @observable
  componentType: LayoutComponentType
  @observable
  isLastInlineComponent: boolean
  childSetTreeLabels: string[]
  childSetRightAttachLabel: string

  @observable
  x: number
  @observable
  y: number
  @observable
  width: number
  @observable
  height: number
  @observable
  marginTop: number

  constructor(
    parentRef: RenderedParentRef,
    selection: NodeSelection,
    childSet: ChildSet,
    layoutComponent: LayoutComponent,
    isLastInlineComponent: boolean
  ) {
    this.parentRef = parentRef
    this.selection = selection
    this.nodes = []
    this.childSet = childSet
    if (selection) {
      // Using selection as a proxy for whether this is a real node or a autcomplete
      this.childSet.registerObserver(this)
    }
    this.componentType = layoutComponent.type
    this.width = 0
    this.height = 0
    this.isLastInlineComponent = isLastInlineComponent
    this.childSet.children.forEach((childNode: SplootNode, i: number) => {
      const isInlineChild = this.componentType === LayoutComponentType.CHILD_SET_INLINE
      const childNodeBlock = new NodeBlock(this, childNode, selection, i, isInlineChild)
      this.nodes.push(childNodeBlock)
    })

    this.updateLayout(layoutComponent)
  }

  updateLayout(layoutComponent: LayoutComponent) {
    this.childSetTreeLabels = []
    if (this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
      if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
        this.childSetTreeLabels = layoutComponent.metadata
      }
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
        this.childSetTreeLabels = layoutComponent.metadata
      }
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT && layoutComponent.metadata) {
      this.childSetRightAttachLabel = layoutComponent.metadata as string
    } else {
      this.childSetRightAttachLabel = ''
    }
  }

  calculateDimensions(x: number, y: number, selection: NodeSelection) {
    this.width = 0
    this.height = 0
    this.marginTop = 0
    this.x = x
    this.y = y
    let insertIndex = -1 // No insert node here.
    if (selection?.cursor?.listBlock === this && selection?.state === SelectionState.Inserting) {
      insertIndex = selection.cursor.index
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_INLINE) {
      let leftPos = x
      if (selection !== null && this.allowInsertCursor()) {
        selection.cursorMap.registerCursorStart(this, 0, leftPos, y, true)
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          this.width += boxWidth
          leftPos += boxWidth
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection)
        leftPos += childNodeBlock.rowWidth
        this.width += childNodeBlock.rowWidth
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
        if (selection !== null && this.allowInsertCursor()) {
          selection.cursorMap.registerCursorStart(this, idx + 1, leftPos, y, true)
        }
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.width += boxWidth
        leftPos += boxWidth
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
      let leftPos = x
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          this.width += boxWidth
          leftPos += boxWidth
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection)
        leftPos += childNodeBlock.rowWidth
        this.width += childNodeBlock.rowWidth
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.width += boxWidth
        leftPos += boxWidth
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
      const labels = this.childSetTreeLabels
      const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
      let topPos = this.isLastInlineComponent ? y : y + NODE_BLOCK_HEIGHT + ROW_SPACING
      this.height = this.isLastInlineComponent ? 0 : NODE_BLOCK_HEIGHT + ROW_SPACING
      let indent = this.isLastInlineComponent ? 32 : 18
      indent += maxLabelWidth
      if (selection !== null && this.nodes.length === 0) {
        selection.cursorMap.registerCursorStart(this, 0, x, y, true)
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
          this.width = Math.max(this.width, boxWidth)
        }
        childNodeBlock.calculateDimensions(x + indent, topPos, selection)
        topPos += childNodeBlock.rowHeight + ROW_SPACING
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.width = Math.max(this.width, childNodeBlock.blockWidth + childNodeBlock.rowWidth + indent)
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, boxWidth)
      }
      this.height -= ROW_SPACING // Remove extra space at the end
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      const labels = this.childSetTreeLabels
      const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
      let topPos = y
      this.height = 0
      let indent = 24
      indent += maxLabelWidth
      if (selection !== null) {
        selection.cursorMap.registerCursorStart(this, 0, x, y, true)
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
          this.width = Math.max(this.width, boxWidth)
        }
        childNodeBlock.calculateDimensions(x + indent, topPos, selection)
        if (selection !== null) {
          if (idx !== 0) {
            selection.cursorMap.registerLineCursor(this, idx, topPos)
          }
          if (idx === this.nodes.length - 1) {
            selection.cursorMap.registerCursorStart(this, idx + 1, x + indent + childNodeBlock.rowWidth, topPos, true)
          }
        }
        topPos += childNodeBlock.rowHeight + ROW_SPACING
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.width = Math.max(this.width, childNodeBlock.blockWidth + childNodeBlock.rowWidth + indent)
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, boxWidth)
      }
      this.height -= ROW_SPACING // Remove extra space at the end
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BLOCK) {
      let topPos = y + ROW_SPACING
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
          this.width = Math.max(this.width, boxWidth)
        }
        childNodeBlock.calculateDimensions(x, topPos, selection)
        if (selection !== null) {
          selection.cursorMap.registerLineCursor(this, idx, topPos + childNodeBlock.marginTop)
        }
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.width = Math.max(this.width, childNodeBlock.rowWidth)
      })
      if (selection !== null && this.nodes.length === 0) {
        selection.cursorMap.registerLineCursor(this, this.nodes.length, topPos)
      }
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, boxWidth)
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_STACK) {
      let topPos = y + ROW_SPACING
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          topPos += NODE_BLOCK_HEIGHT + ROW_SPACING
          this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
          this.width = Math.max(this.width, boxWidth)
        }
        childNodeBlock.calculateDimensions(x, topPos, selection)
        if (selection !== null) {
          selection.cursorMap.registerLineCursor(this, idx, topPos + childNodeBlock.marginTop)
        }
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.height = this.height + childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
        this.width = Math.max(this.width, childNodeBlock.rowWidth)
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.height = this.height + NODE_BLOCK_HEIGHT + ROW_SPACING
        this.width = Math.max(this.width, boxWidth)
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
      let leftPos = x
      if (selection !== null) {
        selection.cursorMap.registerCursorStart(this, 0, x - EXPRESSION_TOKEN_SPACING * 2, y, true)
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          this.width += boxWidth
          leftPos += boxWidth
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection)
        this.marginTop = Math.max(this.marginTop, childNodeBlock.marginTop)
        if (selection !== null) {
          selection.cursorMap.registerCursorStart(this, idx + 1, leftPos + childNodeBlock.rowWidth, y, true)
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
        this.width += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.width += boxWidth
        leftPos += boxWidth
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      const labelWidth = labelStringWidth(this.childSetRightAttachLabel) + 4
      let leftPos = x + 16 + labelWidth
      this.width += labelWidth
      if (selection !== null && this.nodes.length === 0) {
        selection.cursorMap.registerCursorStart(this, 0, x, y, true)
      }
      // Will only ever be one
      this.nodes.forEach((childNodeBlock: NodeBlock) => {
        childNodeBlock.calculateDimensions(leftPos, y, selection)
        leftPos += childNodeBlock.rowWidth
        this.width += childNodeBlock.rowWidth
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
      })
      this.width += 22 // Space for brackets
    }
  }

  getEditData(editIndex: number): EditBoxData {
    const node = this.nodes[editIndex]
    const property = node.node.getEditableProperty()
    if (property === null) {
      return null
    }
    return new EditBoxData(node, property, this.getInsertCoordinates(editIndex))
  }

  getInsertCoordinates(insertIndex: number, cursorOnly = false): number[] {
    if (this.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
      let leftPos = this.x
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [leftPos, this.y]
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [leftPos, this.y]
      }
      return [this.x + this.width, this.y]
    } else if (this.componentType === LayoutComponentType.CHILD_SET_INLINE) {
      let leftPos = this.x
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [leftPos, this.y]
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [leftPos, this.y]
      }
      return [this.x + this.width, this.y]
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BLOCK) {
      let topPos = this.y + ROW_SPACING
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [this.x, topPos + childNodeBlock.marginTop]
        }
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [this.x, topPos]
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_STACK) {
      let topPos = this.y + ROW_SPACING
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [this.x, topPos]
        }
        topPos += childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight + ROW_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [this.x, topPos]
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
      const labels = this.childSetTreeLabels
      const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
      let topPos = this.isLastInlineComponent ? this.y : this.y + NODE_BLOCK_HEIGHT + ROW_SPACING
      let indent = this.isLastInlineComponent ? 32 : 18
      indent += maxLabelWidth

      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [this.x + indent, topPos]
        }
        topPos += childNodeBlock.rowHeight + ROW_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [this.x + indent, topPos]
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      const labels = this.childSetTreeLabels
      const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
      let topPos = this.y
      let indent = 24
      indent += maxLabelWidth
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [this.x + indent, topPos]
        }
        if (i === this.nodes.length - 1 && insertIndex === this.nodes.length && cursorOnly) {
          return [this.x + indent + childNodeBlock.rowWidth, topPos]
        }
        topPos += childNodeBlock.rowHeight + ROW_SPACING
      }
      if (this.nodes.length === insertIndex) {
        return [this.x + indent, topPos]
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      // Only ever one child, so this one is easier to calculate.
      const labelWidth = labelStringWidth(this.childSetRightAttachLabel)
      return [this.x + 18 + labelWidth, this.y]
    }
    console.warn('Insert position not implemented for LayoutComponentType', LayoutComponentType[this.componentType])
    return [100, 100]
  }

  @observable
  getChildSelectionState(idx: number): NodeSelectionState {
    if (this.selectionState === SelectionState.Empty || this.selectedIndex !== idx) {
      return NodeSelectionState.UNSELECTED
    }
    if (this.selectionState === SelectionState.SingleNode) {
      return NodeSelectionState.SELECTED
    }
    if (this.selectionState === SelectionState.Editing) {
      return NodeSelectionState.EDITING
    }
    return NodeSelectionState.UNSELECTED
  }

  @observable
  allowInsertCursor(): boolean {
    if (
      this.componentType === LayoutComponentType.CHILD_SET_TREE ||
      this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS
    ) {
      return false
    }
    return this.childSet.type === ChildSetType.Many || this.childSet.getCount() === 0
  }

  @observable
  allowInsert(): boolean {
    return this.childSet.type === ChildSetType.Many || this.childSet.getCount() === 0
  }

  @observable
  isInsert(idx: number): boolean {
    return this.selectedIndex === idx && this.selectionState === SelectionState.Inserting
  }

  renumberChildren() {
    this.nodes.forEach((nodeBlock: NodeBlock, index: number) => {
      nodeBlock.index = index
    })
  }

  getNextChildInsert(): NodeCursor {
    if (this.allowInsertCursor()) {
      return new NodeCursor(this, 0)
    }
    for (const node of this.nodes) {
      const cursor = node.getNextChildInsertCursor()
      if (cursor) {
        return cursor
      }
    }
    return null
  }

  getNextInsertCursorInOrAfterNode(index: number): NodeCursor {
    let nextChildCursor = null
    if (index < this.nodes.length) {
      nextChildCursor = this.nodes[index].getNextChildInsertCursor()
    }
    if (nextChildCursor) {
      return nextChildCursor
    } else if (this.allowInsertCursor() && index < this.nodes.length) {
      return new NodeCursor(this, index + 1)
    } else {
      nextChildCursor = this.parentRef.node.getNextInsertAfterChildSet(this.parentRef.childSetId)
      if (nextChildCursor) {
        return new NodeCursor(nextChildCursor.listBlock, nextChildCursor.index)
      }
      nextChildCursor = this.parentRef.node.getNextInsertAfterThisNode()
      if (nextChildCursor) {
        return new NodeCursor(nextChildCursor.listBlock, nextChildCursor.index)
      }
    }
    return null
  }

  getBackspaceDeletePosition(index: number): NodeCursor {
    if (
      this.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST ||
      this.componentType === LayoutComponentType.CHILD_SET_INLINE
    ) {
      if (index !== 0) {
        return new NodeCursor(this, index - 1)
      } else {
        if (this.nodes.length === 0) {
          // Delete parent
          // TODO: Don't delete parents when they are required (e.g. if-statement expression)
          return new NodeCursor(this.parentRef.node.parentChildSet, this.parentRef.node.index)
        }
      }
    }

    return null
  }

  /** Called when Enter is pressed
   Returns: [
    NodeCursor - a cursor position for the newline
    boolean - whether or not the original cursor position should be removed (unindented)
    NodeCursor - where to place the insert cursor after the new line is added
   ]
  */
  getNewLinePosition(index: number, allowUnindent = true): [NodeCursor, boolean, NodeCursor] {
    if (
      this.allowInsert() &&
      (this.componentType === LayoutComponentType.CHILD_SET_BLOCK ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS)
    ) {
      // This is an insertable place for a new line, do it.
      return [new NodeCursor(this, index), false, new NodeCursor(this, index + 1)]
    }

    const thisNode = this.parentRef.node
    const parentChildSet = thisNode.parentChildSet
    const parentNode = parentChildSet.parentRef.node

    if (!parentChildSet) {
      // this place is not new-line insertable and there is no parent to escalate to
      return [null, false, null]
    }

    if (
      parentChildSet &&
      parentChildSet.allowInsert() &&
      (parentChildSet.componentType == LayoutComponentType.CHILD_SET_BLOCK ||
        parentChildSet.componentType === LayoutComponentType.CHILD_SET_TREE ||
        parentChildSet.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS)
    ) {
      // Cursor is at the start of a non-empty childset and the direct parent is an insertable newline
      if (index === 0 && this.nodes.length !== 0) {
        const newCursor = new NodeCursor(parentChildSet, thisNode.index)
        return [newCursor, false, new NodeCursor(this, index)]
      }

      // IF: [Cursor is in an empty line] AND [it's the last line in the block]
      // AND [it has a parent node to escalate to] AND [deletion is allowed]
      // AND [it's not the first one (each block/tree children needs at least one)]
      // TODO: Create concept of whether deletion is allowed (?)
      const isLastNodeInParentChildSet = thisNode.index === parentChildSet.nodes.length - 1
      if (allowUnindent && this.nodes.length === 0 && isLastNodeInParentChildSet && thisNode.index !== 0) {
        if (parentNode && parentNode.parentChildSet) {
          const [newCursor] = parentNode.parentChildSet.getNewLinePosition(parentNode.index + 1, false)
          if (newCursor) {
            return [newCursor, true, newCursor]
          }
        }
      }
    }

    // Direct parent is not insertable, go up/forwards in the tree
    // E.g. cursor is inside expression in statement node, cursor is inside if-condition
    if (index === this.nodes.length) {
      const thisChildSetIndex = thisNode.childSetOrder.indexOf(this.parentRef.childSetId)
      const lastChildSetIndex = thisNode.childSetOrder.length - 1
      console.log(thisChildSetIndex, lastChildSetIndex)
      if (thisChildSetIndex !== lastChildSetIndex) {
        const childSetID = thisNode.childSetOrder[thisChildSetIndex + 1]
        return thisNode.renderedChildSets[childSetID].getNewLinePosition(0, false)
      }
      const [insertCursor] = parentChildSet.getNewLinePosition(thisNode.index + 1, false)
      return [insertCursor, false, insertCursor]
    } else if (index === 0) {
      const [insertCursor] = parentChildSet.getNewLinePosition(thisNode.index, false)
      return [insertCursor, false, new NodeCursor(this, index)]
    }
  }

  @action
  handleChildSetMutation(mutation: ChildSetMutation): void {
    if (mutation.type === ChildSetMutationType.INSERT) {
      mutation.nodes.forEach((node: SplootNode, idx: number) => {
        const isInlineChild = this.componentType === LayoutComponentType.CHILD_SET_INLINE
        const nodeBlock = new NodeBlock(this, node, this.selection, mutation.index + idx, isInlineChild)
        this.nodes.splice(mutation.index + idx, 0, nodeBlock)
      })
      this.renumberChildren()
      // When nodes have been inserted, we need to update the scope.
      // TODO: this shouldn't be done by the layout engine.
      // It has to be the parent, since this change might an identifier.
      this.parentRef.node.node.recursivelyBuildScope()
      // We also need to make sure that mutation-firing is enabled/disable according to the parent's setting.
      this.parentRef.node.node.recursivelySetMutations(this.parentRef.node.node.enableMutations)
      // Instead of having ^ this here, we should have a separate mutation watcher that handles scope.
      // Update layout refreshes things like list index numbers and function param names.
      this.parentRef.node.updateLayout()
      this.selection.updateRenderPositions()
      if (mutation.nodes.length === 1) {
        const insertedNode = this.nodes[mutation.index]
        const nextChildCursor = insertedNode.getNextEndOfChildSetInsertCursor()
        if (nextChildCursor) {
          this.selection.placeCursor(nextChildCursor.listBlock, nextChildCursor.index)
        } else {
          const cursor = this.getNextInsertCursorInOrAfterNode(mutation.index)
          if (cursor) {
            this.selection.placeCursor(cursor.listBlock, cursor.index)
          }
        }
      }
    } else if (mutation.type === ChildSetMutationType.DELETE) {
      this.nodes.splice(mutation.index, 1)
      this.renumberChildren()
      if (this.allowInsertCursor()) {
        this.selection.placeCursor(this, mutation.index)
      }
      this.selection.updateRenderPositions()
    }
  }
}
