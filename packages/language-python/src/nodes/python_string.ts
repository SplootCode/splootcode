import { ParseNodeType, StringNode, StringTokenFlags, TokenType } from 'structured-pyright'

import { HighlightColorCategory } from '@splootcode/core'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleteRegistry,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '@splootcode/core'

export const PYTHON_STRING = 'STRING_LITERAL'

class StringGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const emptyString = new PythonStringLiteral(null, '')
    const suggestedNode = new SuggestedNode(emptyString, 'empty string', 'string text empty', true, 'empty string')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    if (textInput.startsWith("'") || textInput.startsWith('"')) {
      let value = textInput.slice(1)
      if (value.length !== 0 && value[value.length - 1] === textInput[0]) {
        value = value.slice(0, value.length - 1)
      }
      const customString = new PythonStringLiteral(null, value)
      const suggestedNode = new SuggestedNode(customString, `string ${value}`, textInput, true, 'string')
      return [suggestedNode]
    }
    return []
  }
}

export class PythonStringLiteral extends PythonNode {
  constructor(parentReference: ParentReference, value: string) {
    super(parentReference, PYTHON_STRING)
    this.properties = { value: value }
  }

  getValue() {
    return this.properties.value
  }

  getEditableProperty() {
    return 'value'
  }

  generateParseTree(parseMapper: ParseMapper): StringNode {
    const val = this.getValue()
    return {
      nodeType: ParseNodeType.String,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      value: val,
      hasUnescapeErrors: false,
      token: {
        escapedValue: val,
        start: 0,
        length: 0,
        flags: StringTokenFlags.None,
        type: TokenType.String,
        prefixLength: 0,
        quoteMarkLength: 0,
      },
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonStringLiteral {
    return new PythonStringLiteral(null, serializedNode.properties.value)
  }

  static register() {
    const stringLiteral = new TypeRegistration()
    stringLiteral.typeName = PYTHON_STRING
    stringLiteral.deserializer = PythonStringLiteral.deserializer
    stringLiteral.properties = ['value']
    stringLiteral.layout = new NodeLayout(
      HighlightColorCategory.LITERAL_STRING,
      [new LayoutComponent(LayoutComponentType.STRING_LITERAL, 'value')],
      NodeBoxType.STRING
    )
    stringLiteral.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(stringLiteral)
    registerNodeCateogry(PYTHON_STRING, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new StringGenerator())

    const registry = getAutocompleteRegistry()
    registry.registerPrefixOverride('"', NodeCategory.PythonExpressionToken, new StringGenerator())
    registry.registerPrefixOverride("'", NodeCategory.PythonExpressionToken, new StringGenerator())
  }
}
