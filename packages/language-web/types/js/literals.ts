import * as recast from 'recast'

import {
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
  getAutocompleteRegistry,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { StringLiteralKind } from 'ast-types/gen/kinds'

export const STRING_LITERAL = 'STRING_LITERAL'
export const NUMERIC_LITERAL = 'NUMERIC_LITERAL'
export const NULL_LITERAL = 'NULL_LITERAL'

class StringGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const emptyString = new StringLiteral(null, '')
    const suggestedNode = new SuggestedNode(emptyString, 'empty string', 'string text empty', true, 'empty string')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    if (textInput.startsWith("'") || textInput.startsWith('"')) {
      let value = textInput.slice(1)
      if (value.length !== 0 && value[value.length - 1] === textInput[0]) {
        value = value.slice(0, value.length - 1)
      }
      const customString = new StringLiteral(null, value)
      const suggestedNode = new SuggestedNode(customString, `string ${value}`, textInput, true, 'string')
      return [suggestedNode]
    }
    return []
  }
}

export class StringLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, value: string) {
    super(parentReference, STRING_LITERAL)
    this.properties = { value: value }
  }

  getValue() {
    return this.properties.value
  }

  getEditableProperty() {
    return 'value'
  }

  generateJsAst(): StringLiteralKind {
    return recast.types.builders.stringLiteral(this.getValue())
  }

  static deserializer(serializedNode: SerializedNode): StringLiteral {
    return new StringLiteral(null, serializedNode.properties.value)
  }

  static register() {
    const stringLiteral = new TypeRegistration()
    stringLiteral.typeName = STRING_LITERAL
    stringLiteral.deserializer = StringLiteral.deserializer
    stringLiteral.properties = ['value']
    stringLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_STRING, [
      new LayoutComponent(LayoutComponentType.STRING_LITERAL, 'value'),
    ])
    stringLiteral.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(stringLiteral)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.ExpressionToken)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.PythonExpressionToken)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.DomNode)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.HtmlAttributeValue)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.ModuleSource)
    registerNodeCateogry(STRING_LITERAL, NodeCategory.StyleSheetPropertyValue)

    registerAutocompleter(NodeCategory.ExpressionToken, new StringGenerator())
    registerAutocompleter(NodeCategory.PythonExpressionToken, new StringGenerator())
    registerAutocompleter(NodeCategory.DomNode, new StringGenerator())
    registerAutocompleter(NodeCategory.HtmlAttributeValue, new StringGenerator())
    registerAutocompleter(NodeCategory.ModuleSource, new StringGenerator())
    registerAutocompleter(NodeCategory.StyleSheetPropertyValue, new StringGenerator())

    const registry = getAutocompleteRegistry()
    registry.registerPrefixOverride('"', NodeCategory.PythonExpressionToken, new StringGenerator())
    registry.registerPrefixOverride("'", NodeCategory.PythonExpressionToken, new StringGenerator())
  }
}

class NumberGenerator implements SuggestionGenerator {
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const val = parseStringToNum(textInput)
    if (!isNaN(val)) {
      const num = new NumericLiteral(null, val)
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

export class NumericLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, value: number) {
    super(parentReference, NUMERIC_LITERAL)
    this.properties = { value: value }
  }

  getValue() {
    return this.getProperty('value')
  }

  generateJsAst() {
    return recast.types.builders.numericLiteral(this.getValue())
  }

  getEditableProperty(): string {
    return 'value'
  }

  setEditablePropertyValue(newValue: string): string {
    const newValueText = '' + parseStringToNum(newValue)
    this.setProperty('value', parseStringToNum(newValue))
    return newValueText
  }

  static deserializer(serializedNode: SerializedNode): NumericLiteral {
    return new NumericLiteral(null, parseStringToNum(serializedNode.properties.value))
  }

  static register() {
    const numericLiteral = new TypeRegistration()
    numericLiteral.typeName = NUMERIC_LITERAL
    numericLiteral.deserializer = NumericLiteral.deserializer
    numericLiteral.properties = ['value']
    numericLiteral.layout = new NodeLayout(HighlightColorCategory.LITERAL_NUMBER, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ])
    numericLiteral.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(numericLiteral)
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.ExpressionToken)
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.PythonExpressionToken)
    registerNodeCateogry(NUMERIC_LITERAL, NodeCategory.HtmlAttributeValue)
    registerAutocompleter(NodeCategory.ExpressionToken, new NumberGenerator())
    registerAutocompleter(NodeCategory.PythonExpressionToken, new NumberGenerator())
    registerAutocompleter(NodeCategory.HtmlAttributeValue, new NumberGenerator())
  }
}

class NullGenerator implements SuggestionGenerator {
  constantSuggestions() {
    return [new SuggestedNode(new NullLiteral(null), 'null', 'null', true, 'null')]
  }
}

export class NullLiteral extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, NULL_LITERAL)
    this.properties = {}
  }

  generateJsAst() {
    return recast.types.builders.nullLiteral()
  }

  static deserializer(serializedNode: SerializedNode): NullLiteral {
    return new NullLiteral(null)
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = NULL_LITERAL
    typeRegistration.deserializer = NullLiteral.deserializer
    typeRegistration.properties = []
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'null'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(typeRegistration)
    registerNodeCateogry(NULL_LITERAL, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new NullGenerator())
  }
}
