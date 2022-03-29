import { action, observable } from 'mobx'

import { AttachRightLayoutHandler } from './attach_right_layout_handler'
import { BlockChildSetLayoutHandler } from './block_layout_handler'
import { BreadcrumbsLayoutHandler } from './breadcrumbs_layout_handler'
import { ChildSet } from '@splootcode/core/language/childset'
import { ChildSetLayoutHandler } from './childset_layout_handler'
import { ChildSetMutation, ChildSetMutationType } from '@splootcode/core/language/mutations/child_set_mutations'
import { ChildSetObserver } from '@splootcode/core/language/observers'
import { EditBoxData } from '../context/edit_box'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NodeBlock, RenderedParentRef } from './rendered_node'
import { NodeCursor, NodeSelection, NodeSelectionState, SelectionState } from '../context/selection'
import { SplootNode } from '@splootcode/core/language/node'
import { StackLayoutHandler } from './stack_layout_handler'
import { TokenLayoutHandler } from './token_layout_handler'
import { TreeLayoutHandler } from './tree_layout_handler'

export const EXPRESSION_TOKEN_SPACING = 6
export const ROW_SPACING = 6

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
export function getTextWidth(text: string, font: string) {
  // re-use canvas object for better performance
  const canvas = getTextWidth['canvas'] || (getTextWidth['canvas'] = document.createElement('canvas'))
  const context = canvas.getContext('2d')
  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}

export function stringWidth(s: string) {
  return getTextWidth(s, "11pt 'Source Sans Pro'")
}

function getInsertBoxWidth(s: string): number {
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

  layoutHandler: ChildSetLayoutHandler

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

    switch (layoutComponent.type) {
      case LayoutComponentType.CHILD_SET_BLOCK:
        this.layoutHandler = new BlockChildSetLayoutHandler(layoutComponent)
        break
      case LayoutComponentType.CHILD_SET_STACK:
        this.layoutHandler = new StackLayoutHandler()
        break
      case LayoutComponentType.CHILD_SET_TOKEN_LIST:
        this.layoutHandler = new TokenLayoutHandler()
        break
      case LayoutComponentType.CHILD_SET_BREADCRUMBS:
        this.layoutHandler = new BreadcrumbsLayoutHandler()
        break
      case LayoutComponentType.CHILD_SET_TREE:
      case LayoutComponentType.CHILD_SET_TREE_BRACKETS:
        this.layoutHandler = new TreeLayoutHandler(layoutComponent)
        break
      case LayoutComponentType.CHILD_SET_ATTACH_RIGHT:
        this.layoutHandler = new AttachRightLayoutHandler()
        break
      default:
        console.warn(`Unsupported childset layout type: ${layoutComponent.type}`)
    }

    this.updateLayout(layoutComponent)
  }

  updateLayout(layoutComponent: LayoutComponent) {
    if (this.layoutHandler) {
      this.layoutHandler.updateLayout(layoutComponent)
    }

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
  }

  calculateDimensions(x: number, y: number, selection: NodeSelection, marginAlreadyApplied = false) {
    this.width = 0
    this.height = 0
    this.marginTop = 0
    this.x = x
    this.y = y
    let insertIndex = -1 // No insert node here.
    let insertBoxWidth = 0
    if (selection?.cursor?.listBlock === this && selection?.state === SelectionState.Inserting) {
      insertIndex = selection.cursor.index
      insertBoxWidth = getInsertBoxWidth(selection.insertBox.contents)
    }

    this.layoutHandler.calculateDimensions(
      x,
      y,
      this.nodes,
      selection,
      this.allowInsert(),
      insertIndex,
      insertBoxWidth,
      marginAlreadyApplied
    )

    if (selection !== null) {
      this.layoutHandler.registerCursorPositions(selection.cursorMap, this)
    }

    this.width = this.layoutHandler.width
    this.height = this.layoutHandler.height
    this.marginTop = this.layoutHandler.marginTop
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
    return this.layoutHandler.getInsertCoordinates(insertIndex, cursorOnly)
  }

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

  allowInsertCursor(index: number): boolean {
    return this.allowInsert() && this.layoutHandler.allowInsertCursor(index)
  }

  allowInsert(): boolean {
    return this.childSet.allowInsert()
  }

  allowDelete(): boolean {
    return this.childSet.allowDelete()
  }

  isInsert(idx: number): boolean {
    return this.selectedIndex === idx && this.selectionState === SelectionState.Inserting
  }

  renumberChildren() {
    this.nodes.forEach((nodeBlock: NodeBlock, index: number) => {
      nodeBlock.index = index
    })
  }

  getNextChildInsert(): NodeCursor {
    if (this.allowInsertCursor(0)) {
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
    } else if (this.allowInsertCursor(index + 1) && index < this.nodes.length) {
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

  isLastChildSetOfParentNode() {
    const thisNode = this.parentRef.node
    const allComponents = thisNode.layout.components
    let lastInline = allComponents[allComponents.length - 1]
    // The last component doens't count if it's an empty stack
    // Needed for IF node that has no else blocks.
    if (
      lastInline.type === LayoutComponentType.CHILD_SET_STACK &&
      thisNode.renderedChildSets[lastInline.identifier].nodes.length === 0
    ) {
      lastInline = allComponents[allComponents.length - 2]
    }
    const res = this.componentType == lastInline.type && this.parentRef.childSetId === lastInline.identifier
    return res
  }

  getUnindent(index: number): [NodeBlock, NodeCursor] {
    if (this.isInsertableLineChildset() && index != 0) {
      // We don't want to delete anything.
      if (index === this.nodes.length) {
        const thisNode = this.parentRef.node
        if (this.isLastChildSetOfParentNode() && thisNode.parentChildSet) {
          const [unindentCursor] = thisNode.parentChildSet.getNewLinePosition(thisNode.index + 1)
          return [null, unindentCursor]
        }
      }
      return [null, null]
    }

    if (!this.parentRef.node.node.isEmpty()) {
      return [null, null]
    }

    // For dictionaries, if the parent is empty too, we want to unindent from that context.
    if (this.parentRef.node?.parentChildSet?.parentRef.node.node.isEmpty()) {
      return this.parentRef.node.parentChildSet.getUnindent(this.parentRef.node.index + 1)
    }

    // Figure out if we should unindent
    const thisNode = this.parentRef.node
    const parentChildSet = thisNode.parentChildSet
    if (!parentChildSet) {
      return [null, null]
    }
    const isLastNodeInParentChildSet = thisNode.index === parentChildSet.nodes.length - 1
    if (
      thisNode.index !== 0 &&
      isLastNodeInParentChildSet &&
      parentChildSet.isLastChildSetOfParentNode() &&
      parentChildSet.isInsertableLineChildset()
    ) {
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
    NodeCursor - where to place the insert cursor after the new line is added
   ]
  */
  getNewLinePosition(index: number): [NodeCursor, NodeCursor] {
    if (this.isInsertableLineChildset()) {
      // TODO: Is this line empty - should that matter?
      return [new NodeCursor(this, index), new NodeCursor(this, index + 1)]
    }

    if (this.componentType === LayoutComponentType.CHILD_SET_STACK) {
      // This is a stack, are we the last node in the stack?
      if (index === this.nodes.length) {
        const parent = this.parentRef.node
        const nextLineCursor = parent.parentChildSet.getParentLineCursorIfEndNode(parent.index + 1)
        return [nextLineCursor, nextLineCursor]
      }
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
      this.selection.updateRenderPositions()
      if (this.allowInsertCursor(mutation.index)) {
        this.selection.placeCursor(this, mutation.index, true)
      }
      this.selection.fixCursorToValidPosition()
    }
  }
}
