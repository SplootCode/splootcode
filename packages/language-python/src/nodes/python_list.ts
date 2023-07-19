import { ListNode, ParseNodeType } from 'structured-pyright'

import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'

export const PYTHON_LIST = 'PYTHON_LIST'

//Block generation example
class ListLiteralGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonList(null)
    return [new SuggestedNode(node, 'list', 'list', true, 'List literal')]
  }
}

export class PythonList extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_LIST)
    this.addChildSet('elements', ChildSetType.Many, NodeCategory.PythonExpression)
    this.getElements().addChild(new PythonExpression(null))
  }

  getElements() {
    return this.getChildSet('elements')
  }

  getLabels(): string[] {
    return this.getElements().children.map((val, idx) => {
      return `item ${idx}`
    })
  }

  generateParseTree(parseMapper: ParseMapper): ListNode {
    const listNode: ListNode = {
      nodeType: ParseNodeType.List,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      entries: [],
    }
    listNode.entries = this.getElements().children.map((expr: PythonExpression) => {
      const exprNode = expr.generateParseTree(parseMapper)
      exprNode.parent = listNode
      return exprNode
    })
    return listNode
  }

  validateSelf(): void {
    const elements = this.getElements().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression) => {
        expression.requireNonEmpty('Cannot have empty list element')
      })
    }
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements', this.getLabels()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonList {
    const node = new PythonList(null)
    node.deserializeChildSet('elements', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_LIST
    typeRegistration.deserializer = PythonList.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_LIST, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new ListLiteralGenerator())
  }
}
