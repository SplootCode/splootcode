import { ChildSetMutation, ChildSetMutationType } from './mutations/child_set_mutations'
import { ChildSetObserver } from './observers'
import { NodeCategory } from './node_category_registry'
import { ParentReference, SplootNode } from './node'
import { StatementCapture } from './capture/runtime_capture'
import { globalMutationDispatcher } from './mutations/mutation_dispatcher'

import * as Y from 'yjs'
import { deseraliseYMapToNode } from './type_registry'

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
  maxChildren: number
  nodeCategory: NodeCategory
  mutationObservers: ChildSetObserver[]
  enableMutations: boolean
  yDoc: Y.Doc
  yArray: Y.Array<any>

  constructor(
    owner: SplootNode,
    childSetId: string,
    type: ChildSetType,
    nodeCategory: NodeCategory,
    minChildren: number,
    maxChildren: number
  ) {
    this.children = []
    this.childParentRef = new ParentReference(owner, childSetId)
    this.type = type
    this.minChildren = minChildren
    if (this.type === ChildSetType.Single) {
      this.maxChildren = 1
    } else if (this.type === ChildSetType.Immutable) {
      this.maxChildren = minChildren
    } else {
      this.maxChildren = maxChildren
    }

    this.nodeCategory = nodeCategory
    this.mutationObservers = []
    this.enableMutations = false
  }

  // childSet.recursivelyAttachYArray(ydoc, yArray)
  recursivelyAttachYArray(yDoc: Y.Doc): Y.Array<any> {
    this.yDoc = yDoc
    const childMaps = this.children.map((node) => {
      const childYMap = node.recursivelyAttachYMap(yDoc)
      return childYMap
    })
    const yArray = new Y.Array()
    yArray.push(childMaps)
    this.yArray = yArray
    this.yArray.observe(this.yObserver)
    return yArray
  }

  yObserver = (event: Y.YArrayEvent<any>, transaction: Y.Transaction) => {
    console.log(event, transaction)
    // Sync with our actual array
    let oldI = 0

    console.log(event.changes.added)
    console.log(event.changes.deleted)

    while (oldI < this.children.length) {
      const nodeMap = this.children[oldI].yMap
      if (event.changes.deleted.has(nodeMap._item)) {
        console.log('Detected a delete at index: ', oldI)
        this.reallyRemoveChild(oldI)
      } else {
        console.log('not deleted:', nodeMap)
        oldI++
      }
    }
    this.yArray.forEach((nodeMap: Y.Map<any>, i) => {
      if (event.changes.added.has(nodeMap._item)) {
        console.log('detected added', i, nodeMap)
        const newNode = deseraliseYMapToNode(this.yDoc, nodeMap)
        this.reallyInsertNode(newNode, i)
      }
    })
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
    if (this.yArray) {
      this.yArray.insert(index, [node.recursivelyAttachYMap(this.yDoc)])
    } else {
      this.reallyInsertNode(node, index)
    }
  }

  reallyInsertNode(node: SplootNode, index: number) {
    if (node.parent) {
      console.warn('Inserting a node which alredy has a parent!')
    }
    this.children.splice(index, 0, node)
    node.parent = this.childParentRef
    if (this.enableMutations) {
      node.afterInsert()
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
    if (this.yArray) {
      const child = this.getChild(index)
      this.yArray.delete(index, 1)
      return child
    } else {
      return this.reallyRemoveChild(index)
    }
  }

  reallyRemoveChild(index: number): SplootNode {
    if (index >= this.children.length) {
      console.warn("Attempting to delete child that doesn't exist!!", index, this.childParentRef.childSetId)
    }
    const child = this.children.splice(index, 1)[0]
    child.beforeRemoval()
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
    child.recursivelyClearObservers()
    return child
  }

  recursivelyClearObservers() {
    this.mutationObservers = []
    this.children.forEach((node) => {
      node.recursivelyClearObservers()
    })
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
