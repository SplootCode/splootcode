import { ChildSetType } from '../../childset'
import { ForLoopData, ForLoopIteration, SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeAnnotation, NodeAnnotationType } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_FOR_LOOP = 'PYTHON_FOR_LOOP'

class ForGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonForLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for', 'for', true)
    return [suggestedNode]
  }
}

export class PythonForLoop extends SplootNode {
  runtimeCapture: ForLoopData
  runtimeCaptureFrame: number
  scopedVariable: string

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FOR_LOOP)
    this.isRepeatableBlock = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.scopedVariable = null
    this.addChildSet('target', ChildSetType.Single, NodeCategory.PythonLoopVariable)
    this.addChildSet('iterable', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('iterable').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
    this.childSetWrapPriorityOrder = ['block', 'target', 'iterable']
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
      const name = (this.getTarget().getChild(0) as PythonIdentifier).getName()
      this.getScope().addVariable(
        name,
        {
          documentation: 'for-loop variable',
        },
        this
      )
      this.scopedVariable = name
    } else if (this.scopedVariable) {
      this.getScope().removeVariable(this.scopedVariable, this)
      this.scopedVariable = null
    }
  }
  removeSelfFromScope(): void {
    if (this.scopedVariable) {
      this.getScope().removeVariable(this.scopedVariable, this)
      this.scopedVariable = null
    }
  }

  getIterable() {
    return this.getChildSet('iterable')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      this.runtimeCapture = null
      return true
    }
    const data = capture.data as ForLoopData
    this.runtimeCapture = data
    this.selectRuntimeCaptureFrame(this.runtimeCaptureFrame)
    return true
  }

  selectRuntimeCaptureFrame(index: number) {
    if (!this.runtimeCapture) {
      this.recursivelyClearRuntimeCapture()
      return
    }
    this.runtimeCaptureFrame = index

    const frames = this.runtimeCapture.frames

    if (frames.length == 0) {
      this.getBlock().recursivelyApplyRuntimeCapture([])
      const mutation = new NodeMutation()
      mutation.node = this
      mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
      mutation.annotations = []
      mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
      this.fireMutation(mutation)
      return
    }

    index = Math.min(this.runtimeCapture.frames.length - 1, index)
    if (index == -1) {
      index = this.runtimeCapture.frames.length - 1
    }
    const annotation: NodeAnnotation[] = []

    const frame = frames[index]

    if (frame.type === 'EXCEPTION') {
      annotation.push({
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: frame.exceptionType,
          errorMessage: frame.exceptionMessage,
        },
      })
    } else {
      const frameData = frame.data as ForLoopIteration
      const iterable = frameData.iterable[0]
      const iterableData = iterable.data as SingleStatementData

      if (iterable.sideEffects && iterable.sideEffects.length > 0) {
        const stdout = iterable.sideEffects
          .filter((sideEffect) => sideEffect.type === 'stdout')
          .map((sideEffect) => sideEffect.value)
          .join('')
        annotation.push({ type: NodeAnnotationType.SideEffect, value: { message: `prints "${stdout}"` } })
      }
      annotation.push({
        type: NodeAnnotationType.ReturnValue,
        value: {
          value: iterableData.result,
          type: iterableData.resultType,
        },
      })
      this.getBlock().recursivelyApplyRuntimeCapture(frameData.block || [])
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotation
    mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)
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
    registerNodeCateogry(PYTHON_FOR_LOOP, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new ForGenerator())
  }
}
