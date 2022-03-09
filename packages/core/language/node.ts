import { ChildSet, ChildSetType } from './childset'
import { NodeAnnotationType } from './annotations/annotations'
import { NodeCategory, isNodeInCategory } from './node_category_registry'
import {
  NodeLayout,
  SerializedNode,
  adaptNodeToPasteDestination,
  deserializeNode,
  getLayout,
  isScopedNodeType,
} from './type_registry'
import { NodeMutation, NodeMutationType } from './mutations/node_mutations'
import { NodeObserver } from './observers'
import { Scope, getGlobalScope } from './scope/scope'
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
  enableMutations: boolean
  mutationObservers: NodeObserver[]
  scope: Scope
  isValid: boolean
  invalidReason: string
  invalidChildSetID: string
  invalidNode: number
  isRepeatableBlock: boolean

  constructor(parent: ParentReference, type: string) {
    this.parent = parent
    this.type = type
    this.isValid = true
    this.invalidReason = ''
    this.childSets = {}
    this.childSetOrder = []
    this.properties = {}
    this.enableMutations = false
    this.mutationObservers = []
    this.scope = null
    this.isRepeatableBlock = false
  }

  get hasChildSets(): boolean {
    return this.childSetOrder.length !== 0
  }

  addChildSet(name: string, type: ChildSetType, category: NodeCategory) {
    this.childSets[name] = new ChildSet(this, name, type, category)
    this.childSetOrder.push(name)
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return []
  }

  getWrapInsertChildSet(childNode: SplootNode): ChildSet {
    for (const childSetID of this.childSetOrder) {
      const childSet = this.getChildSet(childSetID)
      if (childSet.getCount() === 0) {
        if (isNodeInCategory(childNode.type, childSet.nodeCategory)) {
          return childSet
        }
      } else {
        const firstChild = childSet.getChild(0)
        if (firstChild.isEmpty()) {
          const childResult = firstChild.getWrapInsertChildSet(childNode)
          if (childResult) {
            return childResult
          }
        }
      }
    }
    return null
  }

  getScope(skipSelf = false): Scope {
    if (!skipSelf && isScopedNodeType(this.type)) {
      return this.scope
    }
    if (this.parent === null) {
      return getGlobalScope()
    }
    return this.parent.node.getScope()
  }

  addSelfToScope() {
    // No-op default implementation.
    // Variable declarations and named function declarations will do this.
  }

  removeSelfFromScope() {
    // No-op default implementation.
    // Variable declarations and named function declarations will do this.
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

  setValidity(isValid: boolean, reason: string, childset?: string, index?: number) {
    if (this.isValid === isValid && this.invalidReason === reason) {
      return
    }
    this.isValid = isValid
    this.invalidReason = reason
    this.invalidChildSetID = childset
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_VALIDITY
    mutation.validity = { valid: isValid, reason: reason, childset: childset, index: index }
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

  recursivelyBuildScope() {
    if (isScopedNodeType(this.type)) {
      if (this.parent !== null) {
        this.scope = this.parent.node.getScope().addChildScope(this.type)
      } else {
        this.scope = getGlobalScope().addChildScope(this.type)
      }
    }
    this.addSelfToScope()
    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      childSet.getChildren().forEach((node: SplootNode) => {
        node.recursivelyBuildScope()
      })
    })
  }

  recursivelyClearScope() {
    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      childSet.getChildren().forEach((node: SplootNode) => {
        node.recursivelyClearScope()
      })
    })
    this.removeSelfFromScope()
    if (isScopedNodeType(this.type) && this.scope) {
      if (this.parent !== null) {
        this.parent.node.getScope().removeChildScope(this.scope)
      } else {
        getGlobalScope().removeChildScope(this.scope)
      }
      this.scope = null
    }
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
    if (!(childSetId in serializedNode.childSets)) {
      serializedNode.childSets[childSetId] = []
    }
    serializedNode.childSets[childSetId].forEach((serializedChildNode: SerializedNode) => {
      const childNode = deserializeNode(serializedChildNode)
      if (childNode !== null) {
        if (isNodeInCategory(childNode.type, childSet.nodeCategory)) {
          childSet.addChild(childNode)
        } else {
          const adaptedNode = adaptNodeToPasteDestination(childNode, childSet.nodeCategory)
          if (adaptedNode) {
            childSet.addChild(adaptedNode)
          } else {
            console.warn(
              `Child type ${childNode.type} is not compatible with category ${NodeCategory[childSet.nodeCategory]}`
            )
            console.warn(`Unable to adapt using paste adapter!`)
          }
        }
      }
    })
  }

  clone(): SplootNode {
    // lol
    return deserializeNode(this.serialize())
  }
}
