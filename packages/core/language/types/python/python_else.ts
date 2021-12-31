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
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_ELSE_STATEMENT = 'PYTHON_ELSE_STATEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const node = new PythonElseBlock(null)
    // TODO: Check if previous sibling is an if statement
    return [new SuggestedNode(node, `else`, `else`, true, 'Else block', null, 'elseblock')]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonElseBlock extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ELSE_STATEMENT)
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
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
    const trueBlockChildren = this.getBlock().children
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
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
    const blockChildren = this.getBlock().children
    for (let i = 0; i < blockChildren.length; i++) {
      blockChildren[i].recursivelyClearRuntimeCapture()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonElseBlock {
    const node = new PythonElseBlock(null)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ELSE_STATEMENT
    typeRegistration.deserializer = PythonElseBlock.deserializer
    typeRegistration.childSets = {
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'else'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ELSE_STATEMENT, NodeCategory.PythonElseBlock, new Generator())
    registerNodeCateogry(PYTHON_ELSE_STATEMENT, NodeCategory.PythonStatement, new Generator())
  }
}
