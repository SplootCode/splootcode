import {
  ConstantNode,
  KeywordType,
  ParseNode,
  ParseNodeType,
  StringNode,
  StringTokenFlags,
  TokenType,
} from 'structured-pyright'

import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleRegistry,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'

export const PYTHON_NONE = 'PYTHON_NONE'
export const PYTHON_BOOL = 'PYTHON_BOOL'
export const PYTHON_STRING = 'STRING_LITERAL'
export const PYTHON_NUMBER_LITERAL = 'NUMERIC_LITERAL'

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
    stringLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_STRING, [
      new LayoutComponent(LayoutComponentType.STRING_LITERAL, 'value'),
    ])
    stringLiteral.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(stringLiteral)
    registerNodeCateogry(PYTHON_STRING, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new StringGenerator())

    const registry = getAutocompleRegistry()
    registry.registerPrefixOverride('"', NodeCategory.PythonExpressionToken, new StringGenerator())
    registry.registerPrefixOverride("'", NodeCategory.PythonExpressionToken, new StringGenerator())
  }
}

class NumberGenerator implements SuggestionGenerator {
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const val = parseStringToNum(textInput)
    if (!isNaN(val)) {
      const num = new PythonNumberLiteral(null, val)
      const suggestedNode = new SuggestedNode(num, `${val}`, '', true, 'number')
      return [suggestedNode]
    }
    return []
  }
}

function parseStringToNum(textValue: string | number): number {
  if (typeof textValue === 'string') {
    let val = parseInt(textValue)
    if (textValue.includes('.')) {
      val = parseFloat(textValue)
    }
    return val
  }
  return textValue
}

export class PythonNumberLiteral extends PythonNode {
  constructor(parentReference: ParentReference, value: number) {
    super(parentReference, PYTHON_NUMBER_LITERAL)
    this.properties = { value: value }
  }

  getValue() {
    return this.getProperty('value')
  }

  getEditableProperty(): string {
    return 'value'
  }

  setEditablePropertyValue(newValue: string): void {
    this.setProperty('value', parseStringToNum(newValue))
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const numVal = this.getValue()
    return {
      nodeType: ParseNodeType.Number,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      isImaginary: false,
      isInteger: Number.isInteger(numVal),
      value: numVal,
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonNumberLiteral {
    return new PythonNumberLiteral(null, parseStringToNum(serializedNode.properties.value))
  }

  static register() {
    const numericLiteral = new TypeRegistration()
    numericLiteral.typeName = PYTHON_NUMBER_LITERAL
    numericLiteral.deserializer = PythonNumberLiteral.deserializer
    numericLiteral.properties = ['value']
    numericLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_NUMBER, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ])
    numericLiteral.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(numericLiteral)
    registerNodeCateogry(PYTHON_NUMBER_LITERAL, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new NumberGenerator())
  }
}

class PythonNoneGenerator implements SuggestionGenerator {
  constantSuggestions() {
    return [new SuggestedNode(new NoneLiteral(null), 'None', 'null', true, 'None')]
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
