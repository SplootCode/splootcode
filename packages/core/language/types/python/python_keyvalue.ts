import { DictionaryKeyEntryNode, ExpressionNode, ParseNodeType } from 'sploot-checker'

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
import { NodeCategory, registerBlankFillForNodeCategory, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'

export const PYTHON_KEYVALUE = 'PY_KEYVALUE'

export class PythonKeyValue extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_KEYVALUE)
    this.addChildSet('key', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.addChildSet('value', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getKey().addChild(new PythonExpression(null))
    this.getValue().addChild(new PythonExpression(null))
  }

  generateParseTree(parseMapper: ParseMapper): DictionaryKeyEntryNode {
    const entryNode: DictionaryKeyEntryNode = {
      nodeType: ParseNodeType.DictionaryKeyEntry,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      keyExpression: (this.getKey().getChild(0) as PythonExpression).generateParseTree(parseMapper) as ExpressionNode,
      valueExpression: (this.getKey().getChild(0) as PythonExpression).generateParseTree(parseMapper) as ExpressionNode,
    }
    if (entryNode.keyExpression) {
      entryNode.keyExpression.parent = entryNode
    }
    if (entryNode.valueExpression) {
      entryNode.valueExpression.parent = entryNode
    }
    return entryNode
  }

  getKey() {
    return this.getChildSet('key')
  }

  getValue() {
    return this.getChildSet('value')
  }

  isEmpty(): boolean {
    return this.getKey().getChild(0).isEmpty() && this.getValue().getChild(0).isEmpty()
  }

  validateSelf(): void {
    ;(this.getKey().getChild(0) as PythonExpression).requireNonEmpty('Needs a key.')
    ;(this.getValue().getChild(0) as PythonExpression).requireNonEmpty('Needs a value.')
  }

  static deserializer(serializedNode: SerializedNode): PythonKeyValue {
    const node = new PythonKeyValue(null)
    node.getKey().removeChild(0)
    node.deserializeChildSet('key', serializedNode)
    node.getValue().removeChild(0)
    node.deserializeChildSet('value', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_KEYVALUE
    typeRegistration.deserializer = PythonKeyValue.deserializer
    typeRegistration.childSets = { key: NodeCategory.PythonExpression, value: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.KEYWORD,
      [
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'key'),
        new LayoutComponent(LayoutComponentType.SEPARATOR, ':'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'value'),
      ],
      NodeBoxType.INVISIBLE
    )

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_KEYVALUE, NodeCategory.PythonDictionaryKeyValue)
    registerBlankFillForNodeCategory(NodeCategory.PythonDictionaryKeyValue, () => {
      return new PythonKeyValue(null)
    })
  }
}
