import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import { IfStatementData, SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeAnnotation, NodeAnnotationType, getSideEffectAnnotations } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_ELSE_STATEMENT } from './python_else'
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_IF_STATEMENT = 'PYTHON_IF_STATEMENT'

class IfGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonIfStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true)
    return [suggestedNode]
  }
}

export class PythonIfStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getTrueBlock().addChild(new PythonStatement(null))
    this.addChildSet('elseblocks', ChildSetType.Many, NodeCategory.PythonElseBlock)
    this.childSetWrapPriorityOrder = ['trueblock', 'condition', 'elseblock']
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getTrueBlock() {
    return this.getChildSet('trueblock')
  }

  getElseBlocks() {
    return this.getChildSet('elseblocks')
  }

  allowAppendElse(): boolean {
    const elseBlocks = this.getElseBlocks()
    const count = elseBlocks.getCount()
    return count === 0 || elseBlocks.getChild(count - 1).type !== PYTHON_ELSE_STATEMENT
  }

  validateSelf(): void {
    ;(this.getCondition().getChild(0) as PythonExpression).requireNonEmpty('If condition is required')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      return false
    }
    const data = capture.data as IfStatementData
    const condition = data.condition[0]
    const conditionData = condition.data as SingleStatementData

    const annotations: NodeAnnotation[] = getSideEffectAnnotations(condition)
    annotations.push({
      type: NodeAnnotationType.ReturnValue,
      value: {
        type: conditionData.resultType,
        value: conditionData.result,
      },
    })
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotations
    this.fireMutation(mutation)

    this.getTrueBlock().recursivelyApplyRuntimeCapture(data.trueblock || [])
    this.getElseBlocks().recursivelyApplyRuntimeCapture(data.elseblocks || [])
    return true
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
    const blockChildren = this.getTrueBlock().children
    for (let i = 0; i < blockChildren.length; i++) {
      blockChildren[i].recursivelyClearRuntimeCapture()
    }
    const elseChildren = this.getElseBlocks().children
    for (let i = 0; i < elseChildren.length; i++) {
      elseChildren[i].recursivelyClearRuntimeCapture()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonIfStatement {
    const node = new PythonIfStatement(null)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('trueblock', serializedNode)
    node.deserializeChildSet('elseblocks', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_IF_STATEMENT
    typeRegistration.deserializer = PythonIfStatement.deserializer
    typeRegistration.childSets = {
      condition: NodeCategory.PythonExpression,
      trueblock: NodeCategory.PythonStatement,
      elseblocks: NodeCategory.PythonElseBlock,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'trueblock'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_STACK, 'elseblocks'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_IF_STATEMENT, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new IfGenerator())
  }
}
