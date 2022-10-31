import { ExpressionNode, NameNode, ParseNodeType, TokenType } from 'structured-pyright'
import { FunctionSignature } from '@splootcode/language-python/scope/types'
import { HighlightColorCategory } from '@splootcode/core'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core'
import { NodeMutation, NodeMutationType } from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonCallNode } from './python_call_node'
import { ScopeMutation, ScopeMutationType } from '@splootcode/core'

export const PYTHON_CALL_VARIABLE = 'PYTHON_CALL_VARIABLE'

function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ')
  // Don't mess with it if there are no spaces or punctuation.
  if (textInput.indexOf(' ') === -1) {
    return textInput
  }

  return textInput
    .split(' ')
    .map(function (word, index) {
      if (index == 0) {
        // Don't prefix the first word.
        return word
      }
      return '_' + word.toLowerCase()
    })
    .join('')
}

export class PythonCallVariable extends PythonCallNode {
  constructor(parentReference: ParentReference, name: string, signature?: FunctionSignature) {
    super(parentReference, PYTHON_CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.initArgumentsChildSet(signature)
  }

  getIdentifier(): string {
    return this.getProperty('identifier')
  }

  getEditableProperty(): string {
    if (this.getScope()?.canRename(this.getIdentifier())) {
      return 'identifier'
    }
    return null
  }

  setEditablePropertyValue(newValue: string): string {
    const oldValue = this.getIdentifier()
    newValue = sanitizeIdentifier(newValue)
    if (newValue.length > 0) {
      this.getScope().renameIdentifier(oldValue, newValue)
    }
    return newValue
  }

  setIdentifier(identifier: string) {
    this.setProperty('identifier', identifier)
  }

  generateLeftExpression(parseMapper: ParseMapper): ExpressionNode {
    const funcName = this.getIdentifier()

    const leftExpression: NameNode = {
      nodeType: ParseNodeType.Name,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      token: { type: TokenType.Identifier, value: funcName, start: 0, length: 0 },
      value: funcName,
    }
    return leftExpression
  }

  handleScopeMutation(mutation: ScopeMutation) {
    if (mutation.type === ScopeMutationType.RENAME_ENTRY) {
      const oldName = this.getIdentifier()
      if (mutation.previousName !== oldName) {
        console.warn(
          `Rename mutation received ${mutation.previousName} -> ${mutation.newName} but node name is ${oldName}`
        )
      }
      this.setIdentifier(mutation.newName)
    }
    if (mutation.type === ScopeMutationType.ADD_OR_UPDATE_ENTRY || mutation.type === ScopeMutationType.REMOVE_ENTRY) {
      const mutation = new NodeMutation()
      mutation.type = NodeMutationType.UPDATE_NODE_LAYOUT
      mutation.node = this
      this.fireMutation(mutation)
    }
  }

  validateSelf(): void {
    this.validateArguments()
  }

  addSelfToScope(): void {
    this.getScope()?.addWatcher(this.getIdentifier(), this)
  }

  removeSelfFromScope(): void {
    this.getScope()?.removeWatcher(this.getIdentifier(), this)
  }

  getArgumentNames() {
    // TODO: We need to update the metadata when the function signature changes
    // This will likely need a scope mutation of some kind.
    return this.metadata.get('params') || []
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CAP, 'f'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonCallVariable {
    const node = new PythonCallVariable(null, serializedNode.properties['identifier'])
    node.deserializeChildSet('arguments', serializedNode)
    if (serializedNode.meta) {
      for (const metakey in serializedNode.meta) {
        node.metadata.set(metakey, serializedNode.meta[metakey])
      }
    }
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_VARIABLE
    typeRegistration.deserializer = PythonCallVariable.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonFunctionArgument }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CAP, 'f'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_VARIABLE, NodeCategory.PythonExpressionToken)
  }
}
