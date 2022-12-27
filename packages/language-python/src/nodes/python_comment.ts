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
import { PYTHON_STATEMENT, PythonStatement } from './python_statement'
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

  //  No reason to create a parse tree for comments
  generateParseTree(parseMapper: ParseMapper): any {
    return null
  }

  //   turns the comment's serialized JSON into a Python Comment node
  static deserializer(serializedNode: SerializedNode): PythonComment {
    return new PythonComment(null, serializedNode.properties.value)
  }

  // this is what the Type Loader uses to register this
  static register() {
    console.log('register is being called')
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_COMMENT
    typeRegistration.deserializer = PythonComment.deserializer
    typeRegistration.properties = ['value']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CAP, '#'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'value'),
    ])
    typeRegistration.pasteAdapters[PYTHON_STATEMENT] = (node: SplootNode) => {
      const statement = new PythonStatement(null)
      statement.getStatement().addChild(node)
      return statement
    }
    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_COMMENT, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new CommentGenerator())

    const registry = getAutocompleteRegistry()
    registry.registerPrefixOverride('#', NodeCategory.PythonStatementContents, new CommentGenerator())
  }
}
