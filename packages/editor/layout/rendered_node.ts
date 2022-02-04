import { observable } from 'mobx'

import { LayoutComponent, LayoutComponentType, NodeBoxType, NodeLayout } from '@splootcode/core/language/type_registry'
import { LoopAnnotation, NodeAnnotation } from '@splootcode/core/language/annotations/annotations'
import { NodeCursor, NodeSelection } from '../context/selection'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { NodeObserver } from '@splootcode/core/language/observers'
import { RenderedChildSetBlock, stringWidth } from './rendered_childset_block'
import { SplootNode } from '@splootcode/core/language/node'
import { getColour } from '@splootcode/core/colors'

export const NODE_INLINE_SPACING = 6
export const NODE_INLINE_SPACING_SMALL = 6
export const NODE_BLOCK_HEIGHT = 30
export const LOOP_ANNOTATION_HEIGHT = 12
export const INDENTED_BLOCK_PADDING_BOTTOM = 12
const INDENT = 30

export class RenderedParentRef {
  node: NodeBlock
  childSetId: string

  constructor(node: NodeBlock, childSetId: string) {
    this.node = node
    this.childSetId = childSetId
  }
}

export class RenderedInlineComponent {
  layoutComponent: LayoutComponent
  width: number

  constructor(layoutComponent: LayoutComponent, width: number) {
    this.layoutComponent = layoutComponent
    this.width = width
  }
}

// Watches node.
export class NodeBlock implements NodeObserver {
  node: SplootNode
  selection: NodeSelection
  index: number
  parentChildSet: RenderedChildSetBlock

  @observable
  layout: NodeLayout
  textColor: string

  @observable
  renderedInlineComponents: RenderedInlineComponent[]
  @observable
  renderedChildSets: { [key: string]: RenderedChildSetBlock }
  @observable
  childSetOrder: string[]
  @observable
  rightAttachedChildSet: string
  @observable
  leftBreadcrumbChildSet: string

  @observable
  x: number
  @observable
  y: number
  @observable
  rowHeight: number
  @observable
  rowWidth: number
  @observable
  blockWidth: number
  @observable
  indentedBlockHeight: number
  @observable
  marginLeft: number
  @observable
  marginTop: number

  @observable
  runtimeAnnotations: NodeAnnotation[]
  @observable
  loopAnnotation: LoopAnnotation
  @observable
  isValid: boolean
  @observable
  invalidReason: string

  constructor(parentListBlock: RenderedChildSetBlock, node: SplootNode, selection: NodeSelection, index: number) {
    this.parentChildSet = parentListBlock
    this.selection = selection
    this.index = index
    this.renderedChildSets = {}
    this.childSetOrder = []
    this.layout = node.getNodeLayout()
    this.textColor = getColour(this.layout.color)
    this.node = node
    this.isValid = node.isValid
    this.invalidReason = node.invalidReason
    this.runtimeAnnotations = []
    if (selection) {
      // Using selection as a proxy for whether this is a real node or a autcomplete
      this.node.registerObserver(this)
    }
    this.renderedInlineComponents = []
    this.blockWidth = 0
    this.marginLeft = 0

    this.rowHeight = NODE_BLOCK_HEIGHT
    this.indentedBlockHeight = 0
    this.rightAttachedChildSet = null
    this.leftBreadcrumbChildSet = null

    this.layout.components.forEach((component: LayoutComponent, idx: number) => {
      if (
        component.type === LayoutComponentType.CHILD_SET_BLOCK ||
        component.type === LayoutComponentType.CHILD_SET_TREE_BRACKETS ||
        component.type === LayoutComponentType.CHILD_SET_TREE ||
        component.type === LayoutComponentType.CHILD_SET_TOKEN_LIST ||
        component.type === LayoutComponentType.CHILD_SET_ATTACH_RIGHT ||
        component.type === LayoutComponentType.CHILD_SET_BREADCRUMBS ||
        component.type === LayoutComponentType.CHILD_SET_STACK
      ) {
        const childSet = node.getChildSet(component.identifier)
        this.childSetOrder.push(component.identifier)
        const childSetParentRef = new RenderedParentRef(this, component.identifier)
        const renderedChildSet = new RenderedChildSetBlock(childSetParentRef, selection, childSet, component)
        this.renderedChildSets[component.identifier] = renderedChildSet
        if (component.type === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
          this.rightAttachedChildSet = component.identifier
        }
        if (component.type === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
          this.leftBreadcrumbChildSet = component.identifier
        }
      }
    })
  }

  updateLayout() {
    const nodeLayout = this.node.getNodeLayout()
    for (const component of nodeLayout.components) {
      if (
        component.type === LayoutComponentType.CHILD_SET_TREE_BRACKETS ||
        component.type === LayoutComponentType.CHILD_SET_TREE ||
        component.type === LayoutComponentType.CHILD_SET_ATTACH_RIGHT
      ) {
        this.renderedChildSets[component.identifier].updateLayout(component)
      }
    }
  }

  calculateDimensions(x: number, y: number, selection: NodeSelection) {
    this.marginTop = 0
    if (this.node.isRepeatableBlock) {
      this.marginTop = LOOP_ANNOTATION_HEIGHT
    }
    this.x = x
    this.y = y
    const nodeInlineSpacing =
      this.layout.boxType === NodeBoxType.SMALL_BLOCK ? NODE_INLINE_SPACING_SMALL : NODE_INLINE_SPACING
    this.blockWidth = nodeInlineSpacing
    this.rowHeight = NODE_BLOCK_HEIGHT + this.marginTop
    this.indentedBlockHeight = 0
    this.renderedInlineComponents = [] // TODO: Find a way to avoid recreating this every time.

    let leftPos = this.x + nodeInlineSpacing
    if (
      this.layout.boxType === NodeBoxType.INVISIBLE &&
      (!this.parentChildSet ||
        this.parentChildSet.componentType === LayoutComponentType.CHILD_SET_BLOCK ||
        this.parentChildSet.componentType === LayoutComponentType.CHILD_SET_TOKEN_LIST)
    ) {
      leftPos = this.x
      this.blockWidth = 0
    }
    let marginRight = 0
    this.marginLeft = 0
    this.layout.components.forEach((component: LayoutComponent, idx) => {
      if (component.type === LayoutComponentType.CHILD_SET_BLOCK) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(x + INDENT, y + this.rowHeight, selection)
        this.indentedBlockHeight += childSetBlock.height + INDENTED_BLOCK_PADDING_BOTTOM
      } else if (component.type === LayoutComponentType.CHILD_SET_STACK) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(x, y + this.rowHeight + this.indentedBlockHeight, selection)
        this.indentedBlockHeight += childSetBlock.height
      } else if (component.type === LayoutComponentType.STRING_LITERAL) {
        const val = this.node.getProperty(component.identifier)
        const width = stringWidth('""' + val) + nodeInlineSpacing
        this.blockWidth += width
        leftPos += width
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))
      } else if (component.type === LayoutComponentType.PROPERTY) {
        const val = this.node.getProperty(component.identifier)
        const width = stringWidth(val.toString()) + nodeInlineSpacing
        this.blockWidth += width
        leftPos += width
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))
      } else if (component.type === LayoutComponentType.CHILD_SET_TREE) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(leftPos, y + this.marginTop, selection)
        const width = 10
        this.blockWidth += width
        leftPos += width
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))

        this.rowHeight = Math.max(this.rowHeight, childSetBlock.height + this.marginTop)
        // This minus 8 here accounts for the distance from the dot to the edge of the node.
        // This is dumb tbh.
        marginRight += Math.max(childSetBlock.width - 8, 0)
      } else if (component.type === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(leftPos, y + this.marginTop, selection)
        const width = 10
        this.blockWidth += width
        leftPos += width
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))
        this.rowHeight = Math.max(this.rowHeight, childSetBlock.height + this.marginTop)
        // This minus 8 here accounts for the distance from the dot to the edge of the node.
        // This is dumb tbh.
        marginRight += Math.max(childSetBlock.width - 8, 0)
      } else if (component.type === LayoutComponentType.CHILD_SET_BREADCRUMBS) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(x, y + this.marginTop, selection)
        this.marginLeft += childSetBlock.width
        leftPos += childSetBlock.width
      } else if (component.type === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        childSetBlock.calculateDimensions(leftPos + 2, y + this.marginTop, selection)
        this.marginTop = Math.max(this.marginTop, childSetBlock.marginTop)
        this.rowHeight = Math.max(this.rowHeight, childSetBlock.height)
        marginRight += childSetBlock.width + 8 // Extra for line and brackets
      } else if (component.type === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
        const childSetBlock = this.renderedChildSets[component.identifier]
        let shiftLeft = 0
        if (childSetBlock.allowInsert() && this.layout.boxType === NodeBoxType.INVISIBLE) {
          shiftLeft = NODE_INLINE_SPACING
          leftPos -= shiftLeft
          this.blockWidth -= shiftLeft
        }
        childSetBlock.calculateDimensions(leftPos, y + this.marginTop, selection)
        let width = childSetBlock.width
        if (this.layout.boxType !== NodeBoxType.INVISIBLE) {
          width += NODE_INLINE_SPACING
        }
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))
        leftPos += width
        this.blockWidth += width

        this.marginTop = Math.max(this.marginTop, childSetBlock.marginTop)
        this.rowHeight = Math.max(this.rowHeight, childSetBlock.height)
      } else {
        const width = stringWidth(component.identifier) + nodeInlineSpacing
        leftPos += width
        this.blockWidth += width
        this.renderedInlineComponents.push(new RenderedInlineComponent(component, width))
      }
    })

    if (selection !== null && this.layout.boxType !== NodeBoxType.INVISIBLE) {
      selection.cursorMap.registerCursorStart(
        this.parentChildSet,
        this.index,
        x + this.marginLeft,
        y + this.marginTop,
        false
      )
    }
    this.rowWidth = this.marginLeft + this.blockWidth + marginRight
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    // TODO: Handle validation UI changes here.
    if (nodeMutation.type === NodeMutationType.SET_RUNTIME_ANNOTATIONS) {
      this.runtimeAnnotations = nodeMutation.annotations
      this.loopAnnotation = nodeMutation.loopAnnotation
    } else if (nodeMutation.type === NodeMutationType.SET_VALIDITY) {
      this.isValid = nodeMutation.validity.valid
      this.invalidReason = nodeMutation.validity.reason
    }
  }

  selectRuntimeCaptureFrame(idx: number) {
    this.loopAnnotation.currentFrame = idx
    this.node.selectRuntimeCaptureFrame(idx)
  }

  getInlineLayoutComponents(): LayoutComponent[] {
    const inlineComponents = []
    for (const component of this.layout.components) {
      if (
        component.type === LayoutComponentType.CHILD_SET_BLOCK ||
        component.type === LayoutComponentType.CHILD_SET_STACK
      ) {
        break
      }
      inlineComponents.push(component)
    }
    return inlineComponents
  }

  getNextInsertAfterThisNode(): NodeCursor {
    if (this.parentChildSet === null) {
      return null
    }
    if (this.parentChildSet.allowInsertCursor() && this.index < this.parentChildSet.nodes.length) {
      return new NodeCursor(this.parentChildSet, this.index + 1)
    }
    return this.parentChildSet.getNextInsertCursorInOrAfterNode(this.index + 1)
  }

  getNextInsertAfterChildSet(childSetId: string): NodeCursor {
    let index = this.childSetOrder.indexOf(childSetId)
    index += 1
    while (index < this.childSetOrder.length) {
      const nextChildSetId = this.childSetOrder[index]
      const nextChildSet = this.renderedChildSets[nextChildSetId]
      const nextInsert = nextChildSet.getNextChildInsert()
      if (nextInsert) {
        return nextInsert
      }
      index += 1
    }
    // This is the last childset, go up a step.
    return this.getNextInsertAfterThisNode()
  }

  /**
   * When a node is inserted which already has a child (or multiple child nodes) pre-filled
   * we want the cursor to be posisitioned after the last inserted child node.
   *
   * @returns NodeCursor for the new insert position or null if no valid childset insert positions
   */
  getNextEndOfChildSetInsertCursor(): NodeCursor {
    for (const childSetId of this.childSetOrder) {
      const childSetListBlock = this.renderedChildSets[childSetId]
      for (const nodeBlock of childSetListBlock.nodes) {
        const cursor = nodeBlock.getNextEndOfChildSetInsertCursor()
        if (cursor) {
          return cursor
        }
      }
      if (childSetListBlock.allowInsertCursor()) {
        return new NodeCursor(childSetListBlock, childSetListBlock.nodes.length)
      }
    }
    return null
  }

  getNextChildInsertCursor(): NodeCursor {
    for (const childSetId of this.childSetOrder) {
      const childSetListBlock = this.renderedChildSets[childSetId]
      const nextCursor = childSetListBlock.getNextChildInsert()
      if (nextCursor) {
        return nextCursor
      }
    }
    return null
  }
}
