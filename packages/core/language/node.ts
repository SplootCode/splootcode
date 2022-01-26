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
  isRepeatableBlock: boolean

  constructor(parent: ParentReference, type: string) {
    this.parent = parent
    this.type = type
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
        this.scope = new Scope(this.parent.node.getScope())
      } else {
        this.scope = new Scope(getGlobalScope())
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

  getChildSet(name: string) {
    return this.childSets[name]
  }

  getProperty(name: string) {
    return this.properties[name]
  }

  getEditableProperty(): string {
    return null
  }

  setPropertyFromString(name: string, value: string) {
    this.setProperty(name, value)
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

  validate() {
    // Called by a background task to detect things like:
    // Type mismatch, unparseable expression, undefined variable.
  }

  fireMutation(mutation: NodeMutation) {
    this.mutationObservers.forEach((observer: NodeObserver) => {
      observer.handleNodeMutation(mutation)
    })
    // Don't fire global mutations for annotation changes;
    if (mutation.type !== NodeMutationType.SET_RUNTIME_ANNOTATIONS) {
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
    if (!(childSetId in serializedNode.childSets)) {
      serializedNode.childSets[childSetId] = []
      console.warn(`Missing childset ${childSetId} in serialized node`, serializedNode)
    }
    serializedNode.childSets[childSetId].forEach((serializedChildNode: SerializedNode) => {
      const childNode = deserializeNode(serializedChildNode)
      if (childNode !== null) {
        if (isNodeInCategory(childNode.type, childSet.nodeCategory)) {
          childSet.addChild(childNode)
        } else {
          console.warn(
            `Child type ${childNode.type} is not compatible with category ${NodeCategory[childSet.nodeCategory]}`
          )
          const adaptedNode = adaptNodeToPasteDestination(childNode, childSet.nodeCategory)
          if (adaptedNode) {
            childSet.addChild(adaptedNode)
          } else {
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
