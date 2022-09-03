import { action, observable } from 'mobx'

import { AttachRightLayoutHandler } from './attach_right_layout_handler'
import { BlockChildSetLayoutHandler } from './block_layout_handler'
import { BreadcrumbsLayoutHandler } from './breadcrumbs_layout_handler'
import { ChildSet } from '@splootcode/core/language/childset'
import { ChildSetLayoutHandler } from './childset_layout_handler'
import { ChildSetMutation, ChildSetMutationType } from '@splootcode/core/language/mutations/child_set_mutations'
import { ChildSetObserver } from '@splootcode/core/language/observers'
import { CursorMap } from '../context/cursor_map'
import { CursorPosition, NodeCursor, NodeSelection, NodeSelectionState, SelectionState } from '../context/selection'
import { EditBoxData } from '../context/edit_box'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NodeBlock, RenderedParentRef } from './rendered_node'
import { NodeCategory } from '@splootcode/core/language/node_category_registry'
import { SplootNode } from '@splootcode/core/language/node'
import { StackLayoutHandler } from './stack_layout_handler'
import { TokenLayoutHandler } from './token_layout_handler'
import { TreeLayoutHandler } from './tree_layout_handler'
import { stringWidth } from './layout_constants'

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
  selectedIndexStart: number
  @observable
  selectedIndexEnd: number
  @observable
  selectionState: SelectionState
  @observable
  componentType: LayoutComponentType
  @observable
  labels: string[]

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
    this.labels = []
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

    if (layoutComponent.labels) {
      this.labels = layoutComponent.labels
    } else {
      this.labels = []
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
    if (selection?.selectionStart?.listBlock === this && selection?.state === SelectionState.Inserting) {
      insertIndex = selection.selectionStart.index
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

  getChainToRoot(): number[] {
    const index = this.parentRef.node.childSetOrder.indexOf(this.parentRef.childSetId)
    return this.parentRef.node.getChainToRoot().concat(index)
  }

  getEditData(editIndex: number): EditBoxData {
    const node = this.nodes[editIndex]
    const property = node.node.getEditableProperty()
    if (property === null) {
      return null
    }
    return new EditBoxData(node, property, node.getEditCoordinates())
  }

  getInsertCoordinates(insertIndex: number, cursorOnly = false): number[] {
    return this.layoutHandler.getInsertCoordinates(insertIndex, cursorOnly)
  }

  getChildSelectionState(idx: number): NodeSelectionState {
    if (this.selectedIndexStart <= idx && this.selectedIndexEnd > idx) {
      if (this.selectionState === SelectionState.SingleNode || this.selectionState === SelectionState.MultiNode) {
        return NodeSelectionState.SELECTED
      }
      if (this.selectionState === SelectionState.Editing) {
        return NodeSelectionState.EDITING
      }
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
    return this.selectedIndexStart === idx && this.selectionState === SelectionState.Inserting
  }

  renumberChildren() {
    this.nodes.forEach((nodeBlock: NodeBlock, index: number) => {
      nodeBlock.index = index
    })
  }

  getPasteDestinationCategory(): NodeCategory {
    return this.childSet.nodeCategory
  }

  getCursorPosition(cursorMap: CursorMap, index: number): CursorPosition {
    if (this.allowInsertCursor(index)) {
      const [x, y] = this.getInsertCoordinates(index, true)
      const [position] = cursorMap.getCursorPositionByCoordinate(x, y)
      return position
    }
    const insertCursor = this.getNextInsertCursorInOrAfterNode(index)
    return insertCursor.listBlock.getCursorPosition(cursorMap, insertCursor.index)
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

  isInsertableLineChildset(): boolean {
    return (
      this.allowInsert() &&
      (this.componentType === LayoutComponentType.CHILD_SET_BLOCK ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE ||
        this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS)
    )
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

  isLastLineOfParentNode(index: number): boolean {
    if (
      this.componentType === LayoutComponentType.CHILD_SET_BLOCK ||
      this.componentType === LayoutComponentType.CHILD_SET_STACK ||
      this.componentType === LayoutComponentType.CHILD_SET_TREE ||
      this.componentType === LayoutComponentType.CHILD_SET_TREE_BRACKETS
    ) {
      return index == this.nodes.length - 1 && this.isLastChildSetOfParentNode()
    }
    return this.isLastChildSetOfParentNode()
  }

  getUnindentTarget(index: number): NodeCursor {
    if (index === 0 || index === this.nodes.length) {
      return null
    }
    if (!this.nodes[index].node.isEmpty()) {
      return null
    }
    if (this.isLastLineOfParentNode(index)) {
      let parentChildSet = this.parentRef.node.parentChildSet
      let parentIndex = this.parentRef.node.index
      while (
        parentChildSet &&
        !parentChildSet.isInsertableLineChildset() &&
        parentChildSet.isLastLineOfParentNode(parentIndex)
      ) {
        const parentNode = parentChildSet.parentRef.node
        parentChildSet = parentNode.parentChildSet
        parentIndex = parentNode.index
      }
      if (parentChildSet?.isInsertableLineChildset()) {
        return new NodeCursor(parentChildSet, parentIndex + 1)
      }
    }
    return null
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
      this.parentRef.node.updateLayout()
      this.selection.updateRenderPositions()
      this.selection.placeCursor(this, mutation.index, true)
      this.selection.fixCursorToValidPosition()
    }
  }
}
