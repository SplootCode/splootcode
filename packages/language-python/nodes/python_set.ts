import { ParseNodeType, SetNode } from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'

export const PYTHON_SET = 'PY_SET'

class SetLiteralGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonSet(null)
    return [new SuggestedNode(node, 'set', 'set', true, 'set literal')]
  }
}

export class PythonSet extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_SET)
    this.addChildSet('elements', ChildSetType.Many, NodeCategory.PythonExpression)
    this.getElements().addChild(new PythonExpression(null))
  }

  getElements() {
    return this.getChildSet('elements')
  }

  generateParseTree(parseMapper: ParseMapper): SetNode {
    const setNode: SetNode = {
      nodeType: ParseNodeType.Set,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      entries: [],
    }
    this.getElements().children.map((exprNode: PythonExpression) => {
      return exprNode.generateParseTree(parseMapper)
    })
    return setNode
  }

  validateSelf(): void {
    const elements = this.getElements().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression) => {
        expression.requireNonEmpty('Cannot have empty set element')
      })
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonSet {
    const node = new PythonSet(null)
    node.deserializeChildSet('elements', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_SET
    typeRegistration.deserializer = PythonSet.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.PythonExpression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'set'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'elements'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_SET, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new SetLiteralGenerator())
  }
}
