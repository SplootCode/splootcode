import { ConstantNode, KeywordType, ParseNodeType } from 'structured-pyright'

import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_NONE = 'PYTHON_NONE'
export const PYTHON_BOOL = 'PYTHON_BOOL'

class PythonNoneGenerator implements SuggestionGenerator {
  constantSuggestions() {
    return [new SuggestedNode(new NoneLiteral(null), 'none', 'null', true, 'None')]
  }
}

export class NoneLiteral extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_NONE)
    this.properties = {}
  }

  generateParseTree(parseMapper: ParseMapper): ConstantNode {
    const noneNode: ConstantNode = {
      nodeType: ParseNodeType.Constant,
      id: parseMapper.getNextId(),
      constType: KeywordType.None,
      length: 0,
      start: 0,
    }
    return noneNode
  }

  static deserializer(serializedNode: SerializedNode): NoneLiteral {
    return new NoneLiteral(null)
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_NONE
    typeRegistration.deserializer = NoneLiteral.deserializer
    typeRegistration.properties = []
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'None'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_NONE, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new PythonNoneGenerator())
  }
}

class PythonBoolGenerator implements SuggestionGenerator {
  constantSuggestions() {
    return [
      new SuggestedNode(new PythonBool(null, true), 'True', 'true', true, 'True'),
      new SuggestedNode(new PythonBool(null, false), 'False', 'false', true, 'False'),
    ]
  }
}

export class PythonBool extends PythonNode {
  constructor(parentReference: ParentReference, value: boolean) {
    super(parentReference, PYTHON_BOOL)
    this.setProperty('value', value)
  }

  generateParseTree(parseMapper: ParseMapper): ConstantNode {
    const boolNode: ConstantNode = {
      nodeType: ParseNodeType.Constant,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      constType: this.getValue() ? KeywordType.True : KeywordType.False,
    }
    return boolNode
  }

  static deserializer(serializedNode: SerializedNode): NoneLiteral {
    const val = serializedNode.properties['value']
    return new PythonBool(null, !!val)
  }

  getValue(): boolean {
    return this.getProperty('value')
  }

  getNodeLayout() {
    const val = this.getValue() ? 'True' : 'False'
    return new NodeLayout(HighlightColorCategory.KEYWORD, [new LayoutComponent(LayoutComponentType.KEYWORD, val)])
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_BOOL
    typeRegistration.deserializer = PythonBool.deserializer
    typeRegistration.properties = ['value']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_BOOL, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new PythonBoolGenerator())
  }
}
