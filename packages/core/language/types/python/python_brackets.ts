import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
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
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_BRACKETS = 'PY_BRACKET'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonBrackets(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'bracket', '( bracket', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonBrackets extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_BRACKETS)
    this.addChildSet('expr', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('expr').addChild(new PythonExpression(null))
  }

  getExpr() {
    return this.getChildSet('expr')
  }

  validateSelf(): void {
    ;(this.getExpr().getChild(0) as PythonExpression).requireNonEmpty('Empty brackets')
  }

  isEmpty(): boolean {
    return this.getExpr().getChild(0).isEmpty()
  }

  static deserializer(serializedNode: SerializedNode): PythonBrackets {
    const node = new PythonBrackets(null)
    node.getExpr().removeChild(0)
    node.deserializeChildSet('expr', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_BRACKETS
    typeRegistration.deserializer = PythonBrackets.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      value: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.KEYWORD,
      [
        new LayoutComponent(LayoutComponentType.SEPARATOR, '('),
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'expr'),
        new LayoutComponent(LayoutComponentType.SEPARATOR, ')'),
      ],
      NodeBoxType.INVISIBLE
    )
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_BRACKETS, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new Generator())
  }
}
