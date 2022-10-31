import { ParseNodeType, TupleNode } from 'structured-pyright'

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
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '@splootcode/core'

export const PYTHON_TUPLE = 'PY_TUPLE'

class TupleLiteralGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonTuple(null)
    return [new SuggestedNode(node, 'tuple', 'tuple', true, 'Tuple literal')]
  }
}

export class PythonTuple extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_TUPLE)
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

  generateParseTree(parseMapper: ParseMapper): TupleNode {
    const tupleNode: TupleNode = {
      nodeType: ParseNodeType.Tuple,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      enclosedInParens: true,
      expressions: [],
    }
    tupleNode.expressions = this.getElements().children.map((expr: PythonExpression) => {
      const exprNode = expr.generateParseTree(parseMapper)
      exprNode.parent = tupleNode
      return exprNode
    })
    return tupleNode
  }

  validateSelf(): void {
    const elements = this.getElements().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression) => {
        expression.requireNonEmpty('Cannot have empty tuple element')
      })
    }
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'tuple'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements', this.getLabels()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonTuple {
    const node = new PythonTuple(null)
    node.deserializeChildSet('elements', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_TUPLE
    typeRegistration.deserializer = PythonTuple.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'tuple'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_TUPLE, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new TupleLiteralGenerator())
  }
}
