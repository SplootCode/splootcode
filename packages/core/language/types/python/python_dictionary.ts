import { ChildSetType } from '../../childset'
import { DictionaryNode, ParseNode, ParseNodeType } from 'sploot-checker'
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
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonKeyValue } from './python_keyvalue'
import { PythonNode } from './python_node'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_DICT = 'PY_DICT'

class Generator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonDictionary(null)
    return [new SuggestedNode(node, 'dict', 'dict dictionary', true, 'Dictionary literal')]
  }
}

export class PythonDictionary extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_DICT)
    this.addChildSet('elements', ChildSetType.Many, NodeCategory.PythonDictionaryKeyValue)
    this.getElements().addChild(new PythonKeyValue(null))
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const dictNode: DictionaryNode = {
      nodeType: ParseNodeType.Dictionary,
      id: parseMapper.getNextId(),
      entries: [],
      length: 0,
      start: 0,
    }
    dictNode.entries = this.getElements().children.map((element: PythonKeyValue) => {
      const node = element.generateParseTree(parseMapper)
      node.parent = dictNode
      return node
    })
    return dictNode
  }

  getElements() {
    return this.getChildSet('elements')
  }

  static deserializer(serializedNode: SerializedNode): PythonDictionary {
    const node = new PythonDictionary(null)
    node.getElements().removeChild(0)
    node.deserializeChildSet('elements', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_DICT
    typeRegistration.deserializer = PythonDictionary.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonDictionaryKeyValue }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'dict'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_DICT, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new Generator())
  }
}
