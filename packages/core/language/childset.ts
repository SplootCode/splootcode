import { ChildSetMutation, ChildSetMutationType } from './mutations/child_set_mutations'
import { ChildSetObserver } from './observers'
import { NodeCategory } from './node_category_registry'
import { ParentReference, SplootNode } from './node'
import { StatementCapture } from './capture/runtime_capture'
import { globalMutationDispatcher } from './mutations/mutation_dispatcher'

export enum ChildSetType {
  Single = 0,
  Many,
  Immutable,
}

export class ChildSet {
  childParentRef: ParentReference
  children: SplootNode[]
  type: ChildSetType
  minChildren: number
  nodeCategory: NodeCategory
  mutationObservers: ChildSetObserver[]
  enableMutations: boolean

  constructor(owner: SplootNode, childSetId: string, type: ChildSetType, nodeCategory: NodeCategory, minChildren = 0) {
    this.children = []
    this.childParentRef = new ParentReference(owner, childSetId)
    this.type = type
    this.minChildren = minChildren
    this.nodeCategory = nodeCategory
    this.mutationObservers = []
    this.enableMutations = false
  }

  getParentRef() {
    return this.childParentRef
  }

  getChildren() {
    return this.children
  }

  getNodeCategory() {
    return this.nodeCategory
  }

  fireMutation(mutation: ChildSetMutation) {
    this.mutationObservers.forEach((observer: ChildSetObserver) => {
      observer.handleChildSetMutation(mutation)
    })
    globalMutationDispatcher.handleChildSetMutation(mutation)
  }

  registerObserver(observer: ChildSetObserver) {
    this.mutationObservers.push(observer)
  }

  allowInsert(): boolean {
    if (this.type === ChildSetType.Single) {
      return this.children.length === 0
    } else if (this.type === ChildSetType.Immutable) {
      return false
    }
    return true
  }

  insertNode(node: SplootNode, index: number) {
    this.children.splice(index, 0, node)
    node.parent = this.childParentRef
    if (this.enableMutations) {
      node.recursivelyBuildScope()
      node.parent.node.recursivelyValidate()
      node.recursivelySetMutations(true)
      const mutation = new ChildSetMutation()
      mutation.type = ChildSetMutationType.INSERT
      mutation.childSet = this
      mutation.nodes = [node]
      mutation.index = index
      this.fireMutation(mutation)
    }
  }

  allowDelete(): boolean {
    if (this.type === ChildSetType.Immutable) {
      return false
    }
    return this.children.length > this.minChildren
  }

  clearAll() {
    if (this.enableMutations) {
      throw new Error('Cannot use clearAll for childset with mutations enabled.')
    }

    for (const child of this.children) {
      child.parent = null
    }
    this.children = []
  }

  removeChild(index: number): SplootNode {
    if (index >= this.children.length) {
      console.warn("Attempting to delete child that doesn't exist!!", index, this.childParentRef.childSetId)
    }
    const child = this.children.splice(index, 1)[0]
    child.recursivelyClearScope()
    child.parent = null
    child.recursivelyClearValidation()
    if (this.enableMutations) {
      child.recursivelySetMutations(false)
      const parent = this.getParentRef().node
      parent.validateSelf()
      const mutation = new ChildSetMutation()
      mutation.type = ChildSetMutationType.DELETE
      mutation.childSet = this
      mutation.nodes = []
      mutation.index = index
      this.fireMutation(mutation)
    }
    return child
  }

  recursivelyApplyRuntimeCapture(captureList: StatementCapture[]) {
    let i = 0
    let c = 0
    while (i < captureList.length && c < this.children.length) {
      const success = this.children[c].recursivelyApplyRuntimeCapture(captureList[i])
      if (success) {
        i++
      }
      c++
    }
    if (i < captureList.length) {
      console.warn('Unused runtime capture annodation: ', captureList[i])
    }
    while (c < this.children.length) {
      this.children[c].recursivelyClearRuntimeCapture()
      c++
    }
    return true
  }

  addChild(child: SplootNode) {
    this.insertNode(child, this.children.length)
    child.parent = this.childParentRef
  }

  getChild(index: number) {
    return this.children[index]
  }

  getCount(): number {
    return this.children.length
  }

  getIndexOf(node: SplootNode): number {
    return this.children.indexOf(node)
  }

  getLeftChildOf(node: SplootNode): SplootNode {
    const idx = this.children.indexOf(node)
    return this.children[idx - 1]
  }

  getRightChildOf(node: SplootNode): SplootNode {
    const idx = this.children.indexOf(node)
    if (idx + 1 >= this.children.length) {
      return null
    }
    return this.children[idx + 1]
  }

  isChild(node: SplootNode): boolean {
    return this.children.indexOf(node) != -1
  }

  isChildBetween(node: SplootNode, start: SplootNode, end: SplootNode): boolean {
    const idx = this.children.indexOf(node)
    if (idx === -1) {
      return false
    }

    const startIdx = this.children.indexOf(start)
    const endIdx = this.children.indexOf(end)
    return idx > startIdx && idx < endIdx
  }

  getRightmostChild(): SplootNode {
    return this.children[this.children.length - 1]
  }

  getLeftmostChild(): SplootNode {
    return this.children[0]
  }
}
