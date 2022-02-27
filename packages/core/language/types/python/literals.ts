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
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_NONE = 'PYTHON_NONE'
export const PYTHON_BOOL = 'PYTHON_BOOL'

class PythonNoneGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new NoneLiteral(null), 'none', 'null', true, 'None')]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

export class NoneLiteral extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_NONE)
    this.properties = {}
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
  staticSuggestions(parent: ParentReference, index: number) {
    return [
      new SuggestedNode(new PythonBool(null, true), 'True', 'true', true, 'True'),
      new SuggestedNode(new PythonBool(null, false), 'False', 'false', true, 'False'),
    ]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

export class PythonBool extends SplootNode {
  constructor(parentReference: ParentReference, value: boolean) {
    super(parentReference, PYTHON_BOOL)
    this.setProperty('value', value)
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
