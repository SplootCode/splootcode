import {
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  StatementCapture,
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
  // like the name implies, these are autocorrect suggestions that always remain the same ie static
  staticSuggestions(parent: ParentReference, index: number) {
    const emptyComment = new PythonComment(null, '')
    const suggestedNode = new SuggestedNode(emptyComment, 'empty comment', 'comment', true, 'comment')
    return [suggestedNode]
  }
  // while these ones change as you type
  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    if (textInput.startsWith('#')) {
      let value = textInput.slice(1)
      if (value.length !== 0 && value[value.length - 1] === textInput[0]) {
        value = value.slice(0, value.length - 1)
      }
      const customComment = new PythonComment(null, value)
      const suggestedNode = new SuggestedNode(customComment, `comment ${value}`, textInput, true, 'comment')
      return [suggestedNode]
    }
    return []
  }
}

export class PythonComment extends PythonNode {
  constructor(parentReference: ParentReference, value: string) {
    super(parentReference, PYTHON_COMMENT)
    this.setProperty('value', value)
  }

  getValue() {
    return this.properties.value
  }

  // without this, we cannot edit the contents of a comment
  getEditableProperty() {
    return 'value'
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    // Comments won't get runtime annotations.
    return false
  }

  //  No real reason to create a parse tree for comments, so return null
  generateParseTree(parseMapper: ParseMapper): any {
    return null
  }

  //   turns the comment's serialized JSON into a Python Comment node
  static deserializer(serializedNode: SerializedNode): PythonComment {
    return new PythonComment(null, serializedNode.properties.value)
  }

  // this is what the Type Loader uses to register the comment as an accepted node in sploot
  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_COMMENT
    typeRegistration.deserializer = PythonComment.deserializer
    typeRegistration.properties = ['value']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.COMMENT, [
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
