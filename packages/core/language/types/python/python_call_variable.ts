import { ArgumentCategory, ArgumentNode, CallNode, ParseNode, ParseNodeType, TokenType } from 'structured-pyright'
import { ChildSetType } from '../../childset'
import { FunctionArgType, FunctionSignature } from '../../scope/types'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, registerNodeCateogry } from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { ScopeMutation, ScopeMutationType } from '../../mutations/scope_mutations'

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

export class PythonCallVariable extends PythonNode {
  constructor(parentReference: ParentReference, name: string, signature?: FunctionSignature) {
    super(parentReference, PYTHON_CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    const paramNames = []

    if (signature) {
      for (const arg of signature.arguments) {
        paramNames.push(arg.name)

        if (
          (arg.type == FunctionArgType.PositionalOnly || arg.type == FunctionArgType.PositionalOrKeyword) &&
          !arg.defaultValue
        ) {
          this.getArguments().addChild(new PythonExpression(null))
        }
      }
      if (this.getArguments().getCount() === 0) {
        this.getArguments().addChild(new PythonExpression(null))
      }
    }
    this.metadata.set('params', paramNames)
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getIdentifier(): string {
    return this.getProperty('identifier')
  }

  getEditableProperty(): string {
    if (this.getScope().canRename(this.getIdentifier())) {
      return 'identifier'
    }
    return null
  }

  setEditablePropertyValue(newValue: string) {
    const oldValue = this.getIdentifier()
    newValue = sanitizeIdentifier(newValue)
    if (newValue.length > 0) {
      this.getScope().renameIdentifier(oldValue, newValue)
    }
  }

  setIdentifier(identifier: string) {
    this.setProperty('identifier', identifier)
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const funcName = this.getIdentifier()
    let args = this.getArguments().children
    if (args.length === 1 && args[0].isEmpty()) {
      args = []
    }

    const callVarExpr: CallNode = {
      nodeType: ParseNodeType.Call,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      arguments: args.map((argNode) => {
        const ret: ArgumentNode = {
          nodeType: ParseNodeType.Argument,
          argumentCategory: ArgumentCategory.Simple,
          id: parseMapper.getNextId(),
          start: 0,
          length: 0,
          valueExpression: null,
        }
        const valueExpression = (argNode as PythonExpression).generateParseTree(parseMapper)
        ret.valueExpression = valueExpression
        ret.valueExpression.parent = ret
        return ret
      }),
      leftExpression: {
        nodeType: ParseNodeType.Name,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        token: { type: TokenType.Identifier, value: funcName, start: 0, length: 0 },
        value: funcName,
      },
      trailingComma: false,
    }
    callVarExpr.leftExpression.parent = callVarExpr
    callVarExpr.arguments.forEach((arg) => (arg.parent = callVarExpr))
    parseMapper.addNode(this, callVarExpr)
    return callVarExpr
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

  addSelfToScope(): void {
    this.getScope().addWatcher(this.getIdentifier(), this)
  }

  removeSelfFromScope(): void {
    this.getScope().removeWatcher(this.getIdentifier(), this)
  }

  validateSelf(): void {
    const elements = this.getArguments().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression, idx) => {
        // TODO: Add function argument names when required
        expression.requireNonEmpty('Cannot have empty function arguments')
      })
    }
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
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
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
