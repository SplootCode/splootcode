import { ParseNodeType, StringNode, StringTokenFlags, TokenType } from 'structured-pyright'

import {
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
  getAutocompleteRegistry,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'

export const PYTHON_COMMENT = 'PY_COMMENT'

class CommentGenerator implements SuggestionGenerator {
    // like the name implies, these are autocorrect suggestions that always remain the same 
  staticSuggestions(parent: ParentReference, index: number) {
    console.log('static suggestions!')
    const emptyComment = new PythonComment(null, '')
    // this is
    const suggestedNode = new SuggestedNode(emptyComment, 'empty comment', 'comment', true, 'comment')
    return [suggestedNode]
  }
    // while these ones change as you type 
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    console.log('dynamicSuggestions!!')
    if (textInput.startsWith("'") || textInput.startsWith('"')) {
      let value = textInput.slice(1)
      if (value.length !== 0 && value[value.length - 1] === textInput[0]) {
        value = value.slice(0, value.length - 1)
      }
      const customString = new PythonComment(null, value)
      const suggestedNode = new SuggestedNode(customString, `string ${value}`, textInput, true, 'string')
      return [suggestedNode]
    }
    return []
  }
}

export class PythonComment extends PythonNode {
  constructor(parentReference: ParentReference, value: string) {
    super(parentReference, PYTHON_COMMENT)
    this.properties = { value: value }
  }

  getValue() {
    return this.properties.value
  }

  getEditableProperty() {
    return 'value'
  }

//   helps the code be parsed as Code :sweat:
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

//   turns the comment's serialized JSON into a Python Comment node
  static deserializer(serializedNode: SerializedNode): PythonComment {
    return new PythonComment(null, serializedNode.properties.value)
  }

// this is what the Type Loader uses to register this
  static register() {
    console.log('register is being called')
    const comment = new TypeRegistration()
    comment.typeName = PYTHON_COMMENT
    comment.deserializer = PythonComment.deserializer
    comment.properties = ['value']
    comment.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CAP, '#'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ])
    comment.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }
    registerType(comment)
    registerNodeCateogry(PYTHON_COMMENT, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new CommentGenerator())

    const registry = getAutocompleteRegistry()
    registry.registerPrefixOverride('#', NodeCategory.PythonExpressionToken, new CommentGenerator())
  }
}
