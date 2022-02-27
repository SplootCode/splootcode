import { action, observable } from 'mobx'

import { ChildSet, ChildSetType } from '@splootcode/core/language/childset'
import { ChildSetMutation, ChildSetMutationType } from '@splootcode/core/language/mutations/child_set_mutations'
import { ChildSetObserver } from '@splootcode/core/language/observers'
import { EditBoxData } from '../context/edit_box'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NODE_INLINE_SPACING, NodeBlock, RenderedParentRef } from './rendered_node'
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
    layoutComponent: LayoutComponent
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
    this.childSet.children.forEach((childNode: SplootNode, i: number) => {
      const childNodeBlock = new NodeBlock(this, childNode, selection, i)
      this.nodes.push(childNodeBlock)
    })

    this.updateLayout(layoutComponent)
  }

  updateLayout(layoutComponent: LayoutComponent) {
    if (this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
      if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
        this.childSetTreeLabels = layoutComponent.metadata
      } else {
        this.childSetTreeLabels = []
      }
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_TREE) {
      if (layoutComponent.metadata && Array.isArray(layoutComponent.metadata)) {
        this.childSetTreeLabels = layoutComponent.metadata
      } else {
        this.childSetTreeLabels = []
      }
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT && layoutComponent.metadata) {
      this.childSetRightAttachLabel = layoutComponent.metadata as string
    } else {
      this.childSetRightAttachLabel = ''
    }
  }

  calculateDimensions(x: number, y: number, selection: NodeSelection, marginAlreadyApplied = false) {
    this.width = 0
    this.height = 0
    this.marginTop = 0
    this.x = x
    this.y = y
    let insertIndex = -1 // No insert node here.
    if (selection?.cursor?.listBlock === this && selection?.state === SelectionState.Inserting) {
      insertIndex = selection.cursor.index
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
      let leftPos = x
      if (this.nodes.length === 0) {
        leftPos += NODE_INLINE_SPACING * 2
        this.width += NODE_INLINE_SPACING * 2
        if (selection !== null) {
          selection.cursorMap.registerCursorStart(this, 0, x + NODE_INLINE_SPACING, y, true)
        }
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
      })
      if (this.nodes.length === insertIndex) {
        const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
        this.width += boxWidth
        leftPos += boxWidth
      }
    } else if (this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
      const labels = this.childSetTreeLabels
      const maxLabelWidth = Math.max(0, ...labels.map((label) => labelStringWidth(label)))
      let topPos = y
      this.height = 0
      const indent = 24 + maxLabelWidth
      if (selection !== null && this.nodes.length === 0) {
        selection.cursorMap.registerCursorStart(this, 0, x, y, true)
      }
      const bracketWidth = 4
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
        this.width = Math.max(this.width, childNodeBlock.rowWidth + indent + bracketWidth)
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
        childNodeBlock.calculateDimensions(x, topPos, selection, true)
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
      const allowInsert = this.allowInsert()
      let leftPos = x
      if (selection !== null) {
        selection.cursorMap.registerCursorStart(this, 0, leftPos, y, true)
      }
      if (allowInsert) {
        this.width += NODE_INLINE_SPACING
        leftPos += NODE_INLINE_SPACING
      }
      if (this.nodes.length === 0) {
        this.width += NODE_INLINE_SPACING
      } else if (!allowInsert) {
        this.width -= NODE_INLINE_SPACING
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        if (idx === insertIndex) {
          const boxWidth = getInsertBoxWidth(selection.insertBox.contents)
          this.width += boxWidth
          leftPos += boxWidth
        }
        childNodeBlock.calculateDimensions(leftPos, y, selection, idx === 0 && (marginAlreadyApplied || allowInsert))
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
      let leftPos = x + 16 // starting bracket space
      this.width += 16
      this.height = NODE_BLOCK_HEIGHT
      if (selection !== null && this.allowInsert()) {
        selection.cursorMap.registerCursorStart(this, 0, leftPos, y, true)
        leftPos += EXPRESSION_TOKEN_SPACING
        this.width += EXPRESSION_TOKEN_SPACING
      }
      this.nodes.forEach((childNodeBlock: NodeBlock, idx: number) => {
        childNodeBlock.calculateDimensions(leftPos, y, selection)
        if (selection !== null && this.allowInsert()) {
          selection.cursorMap.registerCursorStart(this, idx + 1, leftPos + childNodeBlock.rowWidth, y, true)
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
        this.width += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
        this.height = Math.max(this.height, childNodeBlock.rowHeight + childNodeBlock.indentedBlockHeight)
      })
      if (!this.allowInsert()) {
        this.width -= EXPRESSION_TOKEN_SPACING
      }
      this.width += 8 // Space for brackets at end
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
      let leftPos = this.x + NODE_INLINE_SPACING
      for (let i = 0; i < this.nodes.length; i++) {
        const childNodeBlock = this.nodes[i]
        if (i === insertIndex) {
          return [leftPos - 3, this.y]
        }
        leftPos += childNodeBlock.rowWidth + EXPRESSION_TOKEN_SPACING
      }
      if (this.nodes.length === 0) {
        return [leftPos, this.y]
      }
      if (this.nodes.length === insertIndex) {
        return [leftPos - 3, this.y]
      }
      return [this.x + this.width - 3, this.y]
    } else if (this.componentType === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
      if (this.nodes.length === 0) {
        return [this.x + 3, this.y]
      }
      return [this.x, this.y]
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
        return [this.x - 1, topPos]
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
      let topPos = this.y
      const indent = 32 + maxLabelWidth

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
      let leftPos = this.x + 16 + EXPRESSION_TOKEN_SPACING
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
  allowDelete(): boolean {
    return this.childSet.type !== ChildSetType.Immutable && this.childSet.getCount() !== 0
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

  getDeleteCursorIfEmpty(): NodeCursor {
    const thisNode = this.parentRef.node
    if (thisNode.node.isEmpty()) {
      const parent = thisNode.parentChildSet?.parentRef.node
      if (parent && parent.node.isEmpty() && parent.parentChildSet.allowDelete()) {
        return new NodeCursor(parent.parentChildSet, parent.index)
      }
      if (thisNode.parentChildSet.allowDelete()) {
        return new NodeCursor(thisNode.parentChildSet, thisNode.index)
      }
    }
    return null
  }

  isInsertableLineChildset(): boolean {
    return (
      this.allowInsert() &&
      (this.componentType === LayoutComponentType.CHILD_SET_BLOCK ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS)
    )
  }

  getParentLineCursorIfEndNode(index: number): NodeCursor {
    // Found the line, return that.
    if (this.isInsertableLineChildset()) {
      return new NodeCursor(this, index + 1)
    }

    // This isn't the last node in the childset, so it can't be the last node in the line.
    if (index < this.nodes.length - 1) {
      return null
    }

    const thisNode = this.parentRef.node
    const inlineComponents = thisNode.getInlineLayoutComponents()
    const lastInline = inlineComponents[inlineComponents.length - 1]

    // If this childset is not the last inline component, it's not at the end of the line.
    if (this.componentType !== lastInline.type || this.parentRef.childSetId !== lastInline.identifier) {
      return null
    }

    let after = false
    // If there's an insertable line childset after this one in the same node:
    for (const childSetID of thisNode.childSetOrder) {
      const childSet = thisNode.renderedChildSets[childSetID]
      if (after && childSet.isInsertableLineChildset()) {
        return new NodeCursor(childSet, 0)
      }
      if (childSetID === this.parentRef.childSetId) {
        after = true
      }
    }

    // That index is the last inline node of this node, so check if
    // this node is also the last inline node going up to the nearst line parent.
    return thisNode.parentChildSet.getParentLineCursorIfEndNode(thisNode.index)
  }

  getParentLineCursorIfStartNode(index: number): NodeCursor {
    if (this.isInsertableLineChildset()) {
      return new NodeCursor(this, index)
    }

    // This isn't the first node in the childset, so it can't be the first node in the line.
    if (index !== 0) {
      return null
    }

    const thisNode = this.parentRef.node
    const firstLayoutComponent = thisNode.layout.components[0]
    // If this childset is not the first inline component, it's not at the start of the line.
    if (
      this.componentType !== firstLayoutComponent.type ||
      this.parentRef.childSetId !== firstLayoutComponent.identifier
    ) {
      return null
    }
    return thisNode.parentChildSet.getParentLineCursorIfStartNode(thisNode.index)
  }

  getUnindent(index: number): [NodeBlock, NodeCursor] {
    if (this.isInsertableLineChildset() && index != 0) {
      // Rare case and we likely don't want to delete anything.
      // Would be better to unindent without deletion - needs work.
      return [null, null]
    }

    if (!this.parentRef.node.node.isEmpty()) {
      return [null, null]
    }

    if (this.parentRef.node?.parentChildSet?.parentRef.node.node.isEmpty()) {
      return this.parentRef.node.parentChildSet.getUnindent(this.parentRef.node.index)
    }

    // Figure out if we should unindent
    const thisNode = this.parentRef.node
    const parentChildSet = thisNode.parentChildSet
    if (!parentChildSet) {
      return [null, null]
    }
    const isLastNodeInParentChildSet = thisNode.index === parentChildSet.nodes.length - 1
    if (thisNode.index !== 0 && isLastNodeInParentChildSet && parentChildSet.isInsertableLineChildset()) {
      const parentNode = parentChildSet.parentRef.node
      if (parentNode && parentNode.parentChildSet) {
        const [unindentCursor] = parentNode.parentChildSet.getNewLinePosition(parentNode.index + 1)
        return [thisNode, unindentCursor]
      }
    }
    return [null, null]
  }

  /** Called when Enter is pressed
   Returns: [
    NodeCursor - a cursor position for the newline
    boolean - whether or not the original cursor position should be removed (unindented)
    NodeCursor - where to place the insert cursor after the new line is added
   ]
  */
  getNewLinePosition(index: number): [NodeCursor, NodeCursor] {
    if (this.isInsertableLineChildset()) {
      // TODO: Is this line empty - should that matter?
      return [new NodeCursor(this, index), new NodeCursor(this, index + 1)]
    }

    // Calculate end first because empty lines should be considered "end" not "start" of the line
    // We are at the end of this childset
    if (index === this.nodes.length) {
      const endOfLineInsertCursor = this.getParentLineCursorIfEndNode(index)
      if (endOfLineInsertCursor) {
        // Place cursor into new line
        return [endOfLineInsertCursor, endOfLineInsertCursor]
      }
    }

    // Are we at the start of a line?
    const startOfLineInsertCursor = this.getParentLineCursorIfStartNode(index)
    if (startOfLineInsertCursor) {
      return [startOfLineInsertCursor, new NodeCursor(this, index)]
    }

    return [null, null]
  }

  @action
  handleChildSetMutation(mutation: ChildSetMutation): void {
    if (mutation.type === ChildSetMutationType.INSERT) {
      mutation.nodes.forEach((node: SplootNode, idx: number) => {
        const nodeBlock = new NodeBlock(this, node, this.selection, mutation.index + idx)
        this.nodes.splice(mutation.index + idx, 0, nodeBlock)
      })
      this.renumberChildren()
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
        this.selection.placeCursor(this, mutation.index, true)
      }
      this.selection.updateRenderPositions()
      this.selection.fixCursorToValidPosition()
    }
  }
}
