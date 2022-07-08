import { ChildSet, ChildSetType } from './childset'
import {
  DeserializationError,
  NodeLayout,
  SerializedNode,
  adaptNodeToPasteDestination,
  deserializeNode,
  getLayout,
  isAdaptableToPasteDesintation,
} from './type_registry'
import { NodeAnnotationType } from './annotations/annotations'
import { NodeCategory, isNodeInCategory } from './node_category_registry'
import { NodeMutation, NodeMutationType } from './mutations/node_mutations'
import { NodeObserver } from './observers'
import { ScopeMutation } from './mutations/scope_mutations'
import { StatementCapture } from './capture/runtime_capture'
import { globalMutationDispatcher } from './mutations/mutation_dispatcher'

export class ParentReference {
  node: SplootNode
  childSetId: string // never directly use string ?

  constructor(node: SplootNode, childSetId: string) {
    this.node = node
    this.childSetId = childSetId
  }

  getChildSet(): ChildSet {
    return this.node.getChildSet(this.childSetId)
  }
}

export class SplootNode {
  parent: ParentReference
  type: string
  properties: { [key: string]: any } // Depends on the type
  childSets: { [key: string]: ChildSet }
  childSetOrder: string[]
  childSetWrapPriorityOrder: string[]
  enableMutations: boolean
  mutationObservers: NodeObserver[]
  isValid: boolean
  invalidReason: string
  invalidChildSetID: string
  invalidChildIndex: number
  invalidNode: number
  isRepeatableBlock: boolean
  metadata: Map<string, any>

  constructor(parent: ParentReference, type: string) {
    this.parent = parent
    this.type = type
    this.isValid = true
    this.invalidReason = ''
    this.childSets = {}
    this.childSetOrder = []
    this.childSetWrapPriorityOrder = null
    this.properties = {}
    this.enableMutations = false
    this.mutationObservers = []
    this.isRepeatableBlock = false
    this.metadata = new Map()
  }

  get hasChildSets(): boolean {
    return this.childSetOrder.length !== 0
  }

  addChildSet(name: string, type: ChildSetType, category: NodeCategory, minChildren = 0, maxChildren = -1) {
    this.childSets[name] = new ChildSet(this, name, type, category, minChildren, maxChildren)
    this.childSetOrder.push(name)
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return []
  }

  getWrapInsertChildSet(childNode: SplootNode): ChildSet {
    const order = this.childSetWrapPriorityOrder ? this.childSetWrapPriorityOrder : this.childSetOrder
    for (const childSetID of order) {
      const childSet = this.getChildSet(childSetID)
      if (childSet.getCount() === 0) {
        if (isAdaptableToPasteDesintation(childNode, childSet.nodeCategory)) {
          return childSet
        }
      } else {
        const firstChild = childSet.getChild(0)
        if (firstChild.isEmpty()) {
          if (isAdaptableToPasteDesintation(childNode, childSet.nodeCategory)) {
            return childSet
          }
          const childResult = firstChild.getWrapInsertChildSet(childNode)
          if (childResult) {
            return childResult
          }
        }
      }
    }
    return null
  }

  handleScopeMutation(mutation: ScopeMutation) {
    // No-op default implementation.
  }

  isEmpty(): boolean {
    return false
  }

  validateSelf() {
    // Nodes with validation logic are expected to override this.
  }

  afterInsert() {
    // Called after a node is inserted (only top level inserted node)
    // Can be overridden
  }

  beforeRemoval() {
    // Called before a node is removed (only top level inserted node)
    // Can be overridden
  }

  recursivelyValidate() {
    this.validateSelf()
    this.childSetOrder.forEach((childSetID) => {
      this.getChildSet(childSetID).children.forEach((node) => {
        node.recursivelyValidate()
      })
    })
  }

  recursivelyClearValidation() {
    this.setValidity(true, '')
    this.childSetOrder.forEach((childSetID) => {
      this.getChildSet(childSetID).children.forEach((node) => {
        node.recursivelyClearValidation()
      })
    })
  }

  recursivelyClearObservers() {
    this.mutationObservers = []
    this.childSetOrder.forEach((childSetId) => {
      const childSet = this.getChildSet(childSetId)
      childSet.recursivelyClearObservers()
    })
  }

  setValidity(isValid: boolean, reason: string, childSet?: string, index?: number) {
    if (
      this.isValid === isValid &&
      this.invalidReason === reason &&
      childSet === this.invalidChildSetID &&
      index === this.invalidChildIndex
    ) {
      return
    }
    this.isValid = isValid
    this.invalidReason = reason
    this.invalidChildSetID = childSet
    this.invalidChildIndex = index
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_VALIDITY
    mutation.validity = { valid: isValid, reason: reason, childset: childSet, index: index }
    this.fireMutation(mutation)
  }

  selectRuntimeCaptureFrame(index: number) {
    console.warn(`Capture frames not supported for node type ${this.type}`)
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      return false
    }
    if (capture.type == 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      return false
    }
    return true
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
  }

  applyRuntimeError(capture: StatementCapture) {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = [
      {
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: capture.exceptionType,
          errorMessage: capture.exceptionMessage,
        },
      },
    ]
    this.fireMutation(mutation)
  }

  recursivelySetMutations(enable: boolean) {
    this.enableMutations = enable
    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      childSet.enableMutations = enable
      childSet.getChildren().forEach((node: SplootNode) => {
        node.recursivelySetMutations(enable)
      })
    })
  }

  getChildSet(name: string) {
    return this.childSets[name]
  }

  getProperty(name: string) {
    return this.properties[name]
  }

  getEditableProperty(): string {
    return null
  }

  setEditablePropertyValue(newValue: string) {
    const editableProperty = this.getEditableProperty()
    this.setProperty(editableProperty, newValue)
    this.validateSelf()
  }

  setProperty(name: string, value: any) {
    this.properties[name] = value
    if (this.enableMutations) {
      const mutation = new NodeMutation()
      mutation.node = this
      mutation.property = name
      mutation.value = value
      mutation.type = NodeMutationType.SET_PROPERTY
      this.fireMutation(mutation)
    }
  }

  clean() {
    // Called when a child or sub-child is deleted.
    // Default action is no-op
  }

  fireMutation(mutation: NodeMutation) {
    this.mutationObservers.forEach((observer: NodeObserver) => {
      observer.handleNodeMutation(mutation)
    })
    // Only fire global mutations for specific kinds (not annotation/labels)
    if (mutation.type === NodeMutationType.SET_VALIDITY || mutation.type === NodeMutationType.SET_PROPERTY) {
      globalMutationDispatcher.handleNodeMutation(mutation)
    }
  }

  registerObserver(observer: NodeObserver) {
    this.mutationObservers.push(observer)
  }

  generateCodeString(): string {
    console.warn('Missing generateCodeString implementation for: ', this.type)
    return ''
  }

  getNodeLayout(): NodeLayout {
    return getLayout(this.type)
  }

  serialize(): SerializedNode {
    const result = {
      type: this.type,
      properties: {},
      childSets: {},
    } as SerializedNode
    for (const property in this.properties) {
      result.properties[property] = this.properties[property]
    }
    if (this.metadata.size !== 0) {
      result.meta = Object.fromEntries(this.metadata)
    }

    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      result.childSets[childSetId] = []
      childSet.getChildren().forEach((node: SplootNode) => {
        result.childSets[childSetId].push(node.serialize())
      })
    })
    return result
  }

  deserializeChildSet(childSetId: string, serializedNode: SerializedNode) {
    const childSet = this.getChildSet(childSetId)
    if (!serializedNode.childSets) {
      serializedNode.childSets = {}
    }
    if (childSetId in serializedNode.childSets && serializedNode.childSets[childSetId].length > 0) {
      childSet.clearAll()
    } else {
      serializedNode.childSets[childSetId] = []
    }
    serializedNode.childSets[childSetId].forEach((serializedChildNode: SerializedNode) => {
      const childNode = deserializeNode(serializedChildNode)
      if (isNodeInCategory(childNode.type, childSet.nodeCategory)) {
        childSet.addChild(childNode)
      } else {
        const adaptedNode = adaptNodeToPasteDestination(childNode, childSet.nodeCategory)
        if (adaptedNode) {
          childSet.addChild(adaptedNode)
        } else {
          throw new DeserializationError(
            childNode.type,
            `Node type is incompatible with childset category ${childSet.nodeCategory}`
          )
        }
      }
    })
  }

  clone(): SplootNode {
    // lol
    return deserializeNode(this.serialize())
  }
}
