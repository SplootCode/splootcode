import { ParseNode } from 'structured-pyright'

import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
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
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'

export const PYTHON_BRACKETS = 'PY_BRACKET'

class BracketsGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonBrackets(null)
    const suggestedNode = new SuggestedNode(sampleNode, '(', '( bracket', true)
    return [suggestedNode]
  }
}

export class PythonBrackets extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_BRACKETS)
    this.addChildSet('expr', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getChildSet('expr').addChild(new PythonExpression(null))
  }

  getExpr() {
    return this.getChildSet('expr')
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const exprNode = (this.getExpr().getChild(0) as PythonExpression).generateParseTree(parseMapper)
    parseMapper.addNode(this, exprNode)
    return exprNode
  }

  validateSelf(): void {
    ;(this.getExpr().getChild(0) as PythonExpression).requireNonEmpty('Empty brackets')
  }

  isEmpty(): boolean {
    return this.getExpr().getChild(0).isEmpty()
  }

  static deserializer(serializedNode: SerializedNode): PythonBrackets {
    const node = new PythonBrackets(null)
    node.deserializeChildSet('expr', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_BRACKETS
    typeRegistration.deserializer = PythonBrackets.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      value: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.KEYWORD,
      [
        new LayoutComponent(LayoutComponentType.SEPARATOR, '('),
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'expr'),
        new LayoutComponent(LayoutComponentType.SEPARATOR, ')'),
      ],
      NodeBoxType.BRACKETS
    )
    typeRegistration.pasteAdapters = {
      PYTHON_EXPRESSION: (node: SplootNode) => {
        const exp = new PythonExpression(null)
        exp.getTokenSet().addChild(node)
        return exp
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_BRACKETS, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new BracketsGenerator())
  }
}
