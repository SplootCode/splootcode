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
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_ELSE_STATEMENT } from './python_else'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_IF_STATEMENT = 'PYTHON_IF_STATEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonIfStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonIfStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.PythonExpression)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.PythonStatement)
    this.addChildSet('elseblock', ChildSetType.Single, NodeCategory.PythonElseBlock)
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getTrueBlock() {
    return this.getChildSet('trueblock')
  }

  getElseBlock() {
    return this.getChildSet('elseblock')
  }

  allowAppendElse(): boolean {
    const elseBlocks = this.getElseBlock()
    const count = elseBlocks.getCount()
    return count === 0 || elseBlocks.getChild(count - 1).type !== PYTHON_ELSE_STATEMENT
  }

  clean() {
    this.getTrueBlock().children.forEach((child: SplootNode, index: number) => {
      if (child.type === PYTHON_EXPRESSION) {
        if ((child as PythonExpression).getTokenSet().getCount() === 0) {
          this.getTrueBlock().removeChild(index)
        }
      }
    })
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
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

    let i = 0
    const trueBlockChildren = this.getTrueBlock().children
    if (data.trueblock) {
      const trueBlockData = data.trueblock
      for (; i < trueBlockData.length; i++) {
        trueBlockChildren[i].recursivelyApplyRuntimeCapture(trueBlockData[i])
      }
    }
    if (i < trueBlockChildren.length) {
      for (; i < trueBlockChildren.length; i++) {
        trueBlockChildren[i].recursivelyClearRuntimeCapture()
      }
    }
    if (this.getElseBlock() && this.getElseBlock().getCount() != 0) {
      if (data.elseblock) {
        this.getElseBlock().getChild(0).recursivelyApplyRuntimeCapture(data.elseblock[0])
      } else {
        this.getElseBlock().getChild(0).recursivelyClearRuntimeCapture()
      }
    }
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
    if (this.getElseBlock() && this.getElseBlock().getCount() != 0) {
      this.getElseBlock().getChild(0).recursivelyClearRuntimeCapture()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonIfStatement {
    const node = new PythonIfStatement(null)
    node.getCondition().removeChild(0)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('trueblock', serializedNode)
    node.deserializeChildSet('elseblock', serializedNode)
    return node
  }

  static register() {
    const ifType = new TypeRegistration()
    ifType.typeName = PYTHON_IF_STATEMENT
    ifType.deserializer = PythonIfStatement.deserializer
    ifType.childSets = {
      condition: NodeCategory.PythonExpression,
      trueblock: NodeCategory.PythonStatement,
      elseblock: NodeCategory.PythonElseBlock,
    }
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'trueblock'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_STACK, 'elseblock'),
    ])

    registerType(ifType)
    registerNodeCateogry(PYTHON_IF_STATEMENT, NodeCategory.PythonStatement, new Generator())
  }
}
