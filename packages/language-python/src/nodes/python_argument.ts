import { ArgumentCategory, ArgumentNode, ErrorExpressionCategory, ParseNodeType } from 'structured-pyright'
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
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  getAutocompleteRegistry,
  registerAutocompleteAdapter,
  registerAutocompleter,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { PYTHON_KEWORD_ARGUMENT } from './python_keyword_argument'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'

export const PYTHON_ARGUMENT = 'PY_ARG'

class ExpressionArgumentGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const argNode = parent.node as PythonArgument
    if (!argNode.allowPositional()) {
      return []
    }
    const autocompleter = getAutocompleteRegistry().getAutocompleter(NodeCategory.PythonExpression, new Set())
    return autocompleter.getStaticSuggestions(parent, index)
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    const argNode = parent.node as PythonArgument
    if (!argNode.allowPositional()) {
      return []
    }
    const autocompleter = getAutocompleteRegistry().getAutocompleter(NodeCategory.PythonExpression, new Set())
    return autocompleter.getDynamicSuggestions(parent, index, textInput)
  }
}

export class PythonArgument extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ARGUMENT)
    this.addChildSet('argument', ChildSetType.Single, NodeCategory.PythonFunctionArgumentValue)
  }

  getArgument() {
    return this.getChildSet('argument')
  }

  isEmpty(): boolean {
    return this.getArgument().children.length === 0
  }

  argType(): string {
    const argList = this.getArgument()
    if (argList.children.length === 0) {
      return null
    }
    return argList.getChild(0).type
  }

  allowEmpty() {
    if (this.isEmpty()) {
      this.setValidity(true, '')
    }
  }

  requireNonEmpty(message: string): void {
    if (this.isEmpty()) {
      this.setValidity(false, message)
    }
  }

  validateSelf(): void {
    if (this.isEmpty()) {
      // Empty expressions are valid in some circumstances - let the parent deal with this.
      this.parent.node.validateSelf()
    } else {
      this.setValidity(true, '')
    }
  }

  allowPositional() {
    const argSet = this.parent.getChildSet()
    let allowPositional = true
    for (const arg of argSet.children) {
      if ((arg as PythonArgument).argType() == PYTHON_KEWORD_ARGUMENT) {
        allowPositional = false
      }
      if (arg === this) {
        return allowPositional
      }
    }
    return allowPositional
  }

  allowKeyword() {
    const argSet = this.parent.getChildSet()
    const myIndex = argSet.getIndexOf(this)
    for (let i = myIndex + 1; i < argSet.children.length; i++) {
      const child = argSet.getChild(i)
      if ((child as PythonArgument).argType() !== PYTHON_KEWORD_ARGUMENT) {
        return false
      }
    }
    return true
  }

  clean() {
    if (this.getArgument().getCount() !== 0) {
      const argument = this.getArgument().getChild(0)
      if (argument.type === PYTHON_EXPRESSION && (argument as PythonExpression).isEmpty()) {
        this.getArgument().removeChild(0)
      }
    }
  }

  generateParseTree(parseMapper: ParseMapper): ArgumentNode {
    if (this.getArgument().getCount() === 0) {
      //  TODO: Empty expression node should go here ?
      const ret: ArgumentNode = {
        nodeType: ParseNodeType.Argument,
        argumentCategory: ArgumentCategory.Simple,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        valueExpression: {
          nodeType: ParseNodeType.Error,
          category: ErrorExpressionCategory.MissingExpression,
          id: parseMapper.getNextId(),
          start: 0,
          length: 0,
        },
      }
      ret.valueExpression.parent = ret
      return ret
    }

    const argument = this.getArgument().getChild(0)
    if (argument.type === PYTHON_EXPRESSION) {
      const valueExpression = (argument as PythonExpression).generateParseTree(parseMapper)
      const ret: ArgumentNode = {
        nodeType: ParseNodeType.Argument,
        argumentCategory: ArgumentCategory.Simple,
        id: parseMapper.getNextId(),
        start: 0,
        length: 0,
        valueExpression: null,
      }
      ret.valueExpression = valueExpression
      ret.valueExpression.parent = ret
      return ret
    } else {
      // Other arg types return an argument.
      return (argument as PythonNode).generateParseTree(parseMapper) as ArgumentNode
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonArgument {
    const res = new PythonArgument(null)
    res.deserializeChildSet('argument', serializedNode)
    res.clean()
    return res
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ARGUMENT
    typeRegistration.deserializer = PythonArgument.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = { value: NodeCategory.PythonFunctionArgumentValue }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.NONE,
      [new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'argument')],
      NodeBoxType.INVISIBLE
    )
    typeRegistration.pasteAdapters = {}

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ARGUMENT, NodeCategory.PythonFunctionArgument)
    registerAutocompleter(NodeCategory.PythonFunctionArgumentValue, new ExpressionArgumentGenerator())
    registerAutocompleteAdapter(NodeCategory.PythonFunctionArgument, NodeCategory.PythonFunctionArgumentValue)

    registerBlankFillForNodeCategory(NodeCategory.PythonFunctionArgument, () => {
      return new PythonArgument(null)
    })
  }
}
