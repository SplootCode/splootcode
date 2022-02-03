import { ChildSetType } from '../../childset'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

import { HighlightColorCategory } from '../../../colors'
import { PYTHON_CALL_MEMBER } from './python_call_member'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { PYTHON_IDENTIFIER } from './python_identifier'
import { STRING_LITERAL } from '../literals'

export const PYTHON_SUBSCRIPT = 'PYTHON_SUBSCRIPT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (
      leftChild &&
      [PYTHON_IDENTIFIER, PYTHON_CALL_MEMBER, PYTHON_SUBSCRIPT, STRING_LITERAL, PYTHON_CALL_VARIABLE].indexOf(
        leftChild.type
      ) !== -1
    ) {
      const node = new PythonSubscript(null)
      return [
        new SuggestedNode(node, `subscript`, 'lookup get item', true, 'Call method on object to the left', 'target'),
      ]
    }

    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

export class PythonSubscript extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_SUBSCRIPT)
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.addChildSet('key', ChildSetType.Single, NodeCategory.PythonExpression)
    this.getKey().addChild(new PythonExpression(null))
  }

  getTarget() {
    return this.getChildSet('target')
  }

  getKey() {
    return this.getChildSet('key')
  }

  validateSelf(): void {
    ;(this.getKey().getChild(0) as PythonExpression).requireNonEmpty('Needs the index or key to look up')
    if (this.getTarget().getCount() === 0) {
      this.setValidity(false, 'Needs a collection to get an item from, e.g. list, dictionary')
    } else {
      this.setValidity(true, '')
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonSubscript {
    const node = new PythonSubscript(null)
    node.getKey().removeChild(0)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('key', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_SUBSCRIPT
    typeRegistration.deserializer = PythonSubscript.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'target'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `item`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'key'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_SUBSCRIPT, NodeCategory.PythonExpressionToken, new Generator())
    registerNodeCateogry(PYTHON_SUBSCRIPT, NodeCategory.PythonAssignable, new Generator())
  }
}
