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
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../suggested_node'
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
    this.isRepeatableBlock = true
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonLoopVariable)
    this.addChildSet('iterable', ChildSetType.Single, NodeCategory.PythonExpression)
    this.getChildSet('iterable').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
  }

  getTarget() {
    return this.getChildSet('target')
  }

  validateSelf(): void {
    if (this.getTarget().getCount() === 0) {
      this.setValidity(false, 'Needs a variable name', 'target')
    } else {
      this.setValidity(true, '')
    }
    ;(this.getIterable().getChild(0) as PythonExpression).requireNonEmpty('needs a sequence or iterable to loop over')
  }

  addSelfToScope() {
    const identifierChildSet = this.getTarget()
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === PYTHON_IDENTIFIER) {
      this.getScope().addVariable({
        name: (this.getTarget().getChild(0) as PythonIdentifier).getName(),
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

  static deserializer(serializedNode: SerializedNode): PythonForLoop {
    const node = new PythonForLoop(null)
    node.getIterable().removeChild(0)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('iterable', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_FOR_LOOP
    typeRegistration.deserializer = PythonForLoop.deserializer
    typeRegistration.childSets = {
      target: NodeCategory.PythonLoopVariable,
      iterable: NodeCategory.PythonExpression,
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'for'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'target'),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_FOR_LOOP, NodeCategory.PythonStatementContents, new Generator())
  }
}
