import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_LIST = 'PYTHON_LIST'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const node = new PythonList(null)
    return [new SuggestedNode(node, 'list', 'list', true, 'List literal')]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

export class PythonList extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_LIST)
    this.addChildSet('elements', ChildSetType.Many, NodeCategory.PythonExpression)
    this.getElements().addChild(new PythonExpression(null))
  }

  getElements() {
    return this.getChildSet('elements')
  }

  getLabels() {
    return this.getElements().children.map((val, idx) => {
      return idx
    })
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements', this.getLabels()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonList {
    const node = new PythonList(null)
    node.getElements().removeChild(0)
    node.deserializeChildSet('elements', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_LIST
    typeRegistration.deserializer = PythonList.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_LIST, NodeCategory.PythonExpressionToken, new Generator())
  }
}
