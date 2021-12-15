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
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { SingleStatementData, StatementCapture, WhileLoopData, WhileLoopIteration } from '../../capture/runtime_capture'
import { NodeAnnotation, NodeAnnotationType } from '../../annotations/annotations'

export const PYTHON_WHILE_LOOP = 'PYTHON_WHILE_LOOP'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new PythonWhileLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'while', 'while', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonWhileLoop extends SplootNode {
  runtimeCapture: WhileLoopData
  runtimeCaptureFrame: number

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_WHILE_LOOP)
    this.isLoop = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.addChildSet('condition', ChildSetType.Single, NodeCategory.PythonExpression)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
    // this.addChildSet('elseblock', ChildSetType.Many, NodeCategory.Statement);
  }

  getCondition() {
    return this.getChildSet('condition')
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

  applyRuntimeError(capture: StatementCapture) {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = [
      {
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: capture.exceptionType,
          errorMessage: capture.exceptionMessage,
        },
      },
    ]
    mutation.loopAnnotation = { iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)
  }

  selectRuntimeCaptureFrame(index: number) {
    if (!this.runtimeCapture) {
      this.recursivelyClearRuntimeCapture()
      return
    }
    this.runtimeCaptureFrame = index
    index = Math.min(this.runtimeCapture.frames.length - 1, index)
    if (index == -1) {
      index = this.runtimeCapture.frames.length - 1
    }
    const annotation: NodeAnnotation[] = []

    const frames = this.runtimeCapture.frames
    const frame = frames[index]
    let i = 0
    const trueBlockChildren = this.getBlock().children

    if (frame.type === 'EXCEPTION') {
      annotation.push({
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: frame.exceptionType,
          errorMessage: frame.exceptionMessage,
        },
      })
    } else {
      const frameData = frame.data as WhileLoopIteration
      const condition = frameData.condition[0]
      const conditionData = condition.data as SingleStatementData

      if (condition.sideEffects.length > 0) {
        const stdout = condition.sideEffects
          .filter((sideEffect) => sideEffect.type === 'stdout')
          .map((sideEffect) => sideEffect.value)
          .join('')
        annotation.push({ type: NodeAnnotationType.SideEffect, value: { message: `prints "${stdout}"` } })
      }
      annotation.push({
        type: NodeAnnotationType.ReturnValue,
        value: {
          value: conditionData.result,
          type: conditionData.resultType,
        },
      })
      const trueBlockData = frameData.block
      for (; i < trueBlockData.length; i++) {
        trueBlockChildren[i].recursivelyApplyRuntimeCapture(trueBlockData[i])
      }
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotation
    mutation.loopAnnotation = { iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)

    // Clear remaining children nodes
    if (i < trueBlockChildren.length) {
      for (; i < trueBlockChildren.length; i++) {
        trueBlockChildren[i].recursivelyClearRuntimeCapture()
      }
    }
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      this.runtimeCapture = null
      return
    }
    const data = capture.data as WhileLoopData
    this.runtimeCapture = data
    this.selectRuntimeCaptureFrame(this.runtimeCaptureFrame)
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

  static deserializer(serializedNode: SerializedNode): PythonWhileLoop {
    const node = new PythonWhileLoop(null)
    node.getCondition().removeChild(0)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const ifType = new TypeRegistration()
    ifType.typeName = PYTHON_WHILE_LOOP
    ifType.deserializer = PythonWhileLoop.deserializer
    ifType.childSets = {
      condition: NodeCategory.PythonExpression,
      block: NodeCategory.PythonStatement,
    }
    ifType.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'while'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])

    registerType(ifType)
    registerNodeCateogry(PYTHON_WHILE_LOOP, NodeCategory.PythonStatement, new Generator())
  }
}
