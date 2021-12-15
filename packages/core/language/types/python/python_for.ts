import { SplootNode, ParentReference } from '../../node'
import { ChildSetType } from '../../childset'
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from '../../node_category_registry'
import {
  TypeRegistration,
  NodeLayout,
  LayoutComponentType,
  LayoutComponent,
  registerType,
  SerializedNode,
} from '../../type_registry'
import { SuggestedNode } from '../../suggested_node'
import { HighlightColorCategory } from '../../../colors'
import { PythonExpression, PYTHON_EXPRESSION } from './python_expression'
import { PythonDeclaredIdentifier, PYTHON_DECLARED_IDENTIFIER } from './declared_identifier'
import { VariableDefinition } from '../../definitions/loader'

export const PYTHON_FOR_LOOP = 'PYTHON_FOR_LOOP'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonForLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for', 'for', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonForLoop extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FOR_LOOP)
    this.isLoop = true
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonAssignableExpressionToken)
    this.addChildSet('iterable', ChildSetType.Single, NodeCategory.PythonExpression)
    this.getChildSet('iterable').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
  }

  getTarget() {
    return this.getChildSet('target')
  }

  addSelfToScope() {
    const identifierChildSet = this.getTarget()
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === PYTHON_DECLARED_IDENTIFIER) {
      this.getScope().addVariable({
        name: (this.getTarget().getChild(0) as PythonDeclaredIdentifier).getName(),
        deprecated: false,
        documentation: 'for-loop variable',
        type: { type: 'any' },
      } as VariableDefinition)
    }
  }

  getIterable() {
    return this.getChildSet('iterable')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  clean() {
    this.getBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getBlock().removeChild(index)
        }
      }
    })
  }

  static deserializer(serializedNode: SerializedNode): PythonForLoop {
    const node = new PythonForLoop(null)
    node.getIterable().removeChild(0)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('iterable', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const ifType = new TypeRegistration()
    ifType.typeName = PYTHON_FOR_LOOP
    ifType.deserializer = PythonForLoop.deserializer
    ifType.childSets = {
      target: NodeCategory.PythonAssignableExpressionToken,
      iterable: NodeCategory.PythonExpression,
      block: NodeCategory.PythonStatement,
    }
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'for'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'target'),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])

    registerType(ifType)
    registerNodeCateogry(PYTHON_FOR_LOOP, NodeCategory.PythonStatement, new Generator())
  }
}
