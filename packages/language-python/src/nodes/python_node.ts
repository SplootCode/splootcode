import { ParseNode } from 'structured-pyright'

import { ParentReference, SplootNode, isScopedNodeType } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonScope } from '../scope/python_scope'

export function isPythonNode(node: SplootNode): node is PythonNode {
  return (<PythonNode>node).isPythonNode !== undefined
}

export abstract class PythonNode extends SplootNode {
  scope: PythonScope
  isPythonNode: true

  constructor(parent: ParentReference, type: string) {
    super(parent, type)
    this.isPythonNode = true
    if (parent?.node && !isPythonNode(parent.node)) {
      throw new Error(`Node ${type} must be a child of a PythonNode.`)
    }
    this.scope = null
  }

  getScope(skipSelf = false): PythonScope {
    if (!skipSelf && isScopedNodeType(this.type)) {
      return this.scope
    }
    if (this.parent === null) {
      return null
    }
    return (this.parent.node as PythonNode).getScope()
  }

  addSelfToScope() {
    // No-op default implementation.
    // Variable declarations and named function declarations will do this.
  }

  removeSelfFromScope() {
    // No-op default implementation.
    // Variable declarations and named function declarations will do this.
  }

  afterInsert() {
    this.recursivelyBuildScope()
  }

  beforeRemoval(): void {
    this.recursivelyClearScope()
  }

  recursivelyBuildScope(globalScope?: PythonScope) {
    if (isScopedNodeType(this.type)) {
      if (this.parent !== null) {
        this.scope = (this.parent.node as PythonNode).getScope().addChildScope(this.type)
      } else {
        this.scope = globalScope.addChildScope(this.type)
      }
    }
    this.addSelfToScope()
    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      childSet.getChildren().forEach((node: SplootNode) => {
        if (isPythonNode(node)) {
          node.recursivelyBuildScope(globalScope)
        }
      })
    })
  }

  recursivelyClearScope() {
    this.childSetOrder.forEach((childSetId: string) => {
      const childSet = this.getChildSet(childSetId)
      childSet.getChildren().forEach((node: SplootNode) => {
        if (isPythonNode(node)) {
          node.recursivelyClearScope()
        }
      })
    })
    this.removeSelfFromScope()
    if (isScopedNodeType(this.type) && this.scope) {
      if (this.parent !== null) {
        ;(this.parent.node as PythonNode).getScope().removeChildScope(this.scope)
      } else {
        this.scope.getGlobalScope().removeChildScope(this.scope)
      }
      this.scope = null
    }
  }

  abstract generateParseTree(parseMapper: ParseMapper): ParseNode
}
