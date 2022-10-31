import {
  ArgumentCategory,
  ArgumentNode,
  ErrorExpressionCategory,
  ExpressionNode,
  IndexNode,
  ParseNode,
  ParseNodeType,
} from 'structured-pyright'
import { ChildSetType } from '@splootcode/core'
import { HighlightColorCategory } from '@splootcode/core'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, SuggestionGenerator, registerAutocompleter, registerNodeCateogry } from '@splootcode/core'
import { PYTHON_BRACKETS } from './python_brackets'
import { PYTHON_CALL_MEMBER } from './python_call_member'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_DICT } from './python_dictionary'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { PYTHON_IDENTIFIER } from './python_identifier'
import { PYTHON_LIST } from './python_list'
import { PYTHON_MEMBER } from './python_member'
import { PYTHON_STRING } from './python_string'
import { PYTHON_TUPLE } from './python_tuple'
import { ParentReference, SplootNode } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '@splootcode/core'

export const PYTHON_SUBSCRIPT = 'PYTHON_SUBSCRIPT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (
      leftChild &&
      [
        PYTHON_IDENTIFIER,
        PYTHON_CALL_MEMBER,
        PYTHON_CALL_VARIABLE,
        PYTHON_MEMBER,
        PYTHON_SUBSCRIPT,
        PYTHON_STRING,
        PYTHON_BRACKETS,
        PYTHON_LIST,
        PYTHON_TUPLE,
        PYTHON_DICT,
      ].indexOf(leftChild.type) !== -1
    ) {
      const node = new PythonSubscript(null)
      return [
        new SuggestedNode(
          node,
          `item`,
          'item lookup get',
          true,
          'Access one item from a collection by index or key',
          'target'
        ),
      ]
    }

    return []
  }
}

export class PythonSubscript extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_SUBSCRIPT)
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.addChildSet('key', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getKey().addChild(new PythonExpression(null))
  }

  getTarget() {
    return this.getChildSet('target')
  }

  getKey() {
    return this.getChildSet('key')
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return this.getTarget().children
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    let targetExpression: ExpressionNode
    if (this.getTarget().getCount() === 0) {
      targetExpression = {
        nodeType: ParseNodeType.Error,
        category: ErrorExpressionCategory.MissingExpression,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
      }
    } else {
      targetExpression = (this.getTarget().getChild(0) as PythonNode).generateParseTree(parseMapper) as ExpressionNode
    }
    const argNode: ArgumentNode = {
      nodeType: ParseNodeType.Argument,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      argumentCategory: ArgumentCategory.Simple,
      valueExpression: (this.getKey().getChild(0) as PythonExpression).generateParseTree(parseMapper),
    }
    if (argNode.valueExpression) {
      argNode.valueExpression.parent = argNode
    }
    const indexNode: IndexNode = {
      nodeType: ParseNodeType.Index,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      baseExpression: targetExpression,
      items: [argNode],
      trailingComma: false,
    }
    argNode.parent = indexNode
    if (indexNode.baseExpression) {
      indexNode.baseExpression.parent = indexNode
    }
    parseMapper.addNode(this, indexNode)
    return indexNode
  }

  validateSelf(): void {
    ;(this.getKey().getChild(0) as PythonExpression).requireNonEmpty('Needs the index or key to look up')
    if (this.getTarget().getCount() === 0) {
      this.setValidity(false, 'Needs a collection to get an item from, e.g. list, dictionary', 'target')
    } else {
      this.setValidity(true, '')
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonSubscript {
    const node = new PythonSubscript(null)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('key', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_SUBSCRIPT
    typeRegistration.deserializer = PythonSubscript.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'target', ['collection']),
      new LayoutComponent(LayoutComponentType.KEYWORD, `item`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'key', ['index or key']),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_SUBSCRIPT, NodeCategory.PythonExpressionToken)
    registerNodeCateogry(PYTHON_SUBSCRIPT, NodeCategory.PythonAssignable)

    registerAutocompleter(NodeCategory.PythonExpressionToken, new Generator())
    registerAutocompleter(NodeCategory.PythonAssignable, new Generator())
  }
}
