import { ParseNodeType, WhileNode } from 'structured-pyright'

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
import { NodeAnnotation, NodeAnnotationType } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SingleStatementData, StatementCapture, WhileLoopData, WhileLoopIteration } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_WHILE_LOOP = 'PYTHON_WHILE_LOOP'

class WhileGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonWhileLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'while', 'while', true)
    return [suggestedNode]
  }
}

export class PythonWhileLoop extends PythonNode {
  runtimeCapture: WhileLoopData
  runtimeCaptureFrame: number

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_WHILE_LOOP)
    this.isRepeatableBlock = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.addChildSet('condition', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getChildSet('block').addChild(new PythonStatement(null))
    this.childSetWrapPriorityOrder = ['block', 'condition']
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  generateParseTree(parseMapper: ParseMapper): WhileNode {
    const whileNode: WhileNode = {
      nodeType: ParseNodeType.While,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      testExpression: (this.getCondition().getChild(0) as PythonExpression).generateParseTree(parseMapper),
      whileSuite: {
        nodeType: ParseNodeType.Suite,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
        statements: [],
      },
    }

    whileNode.testExpression.parent = whileNode
    whileNode.whileSuite.parent = whileNode
    this.getBlock().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        whileNode.whileSuite.statements.push(statement)
        statement.parent = whileNode.whileSuite
      }
    })
    return whileNode
  }

  validateSelf(): void {
    ;(this.getCondition().getChild(0) as PythonExpression).requireNonEmpty('If condition is required')
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
    mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
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

      if (condition.sideEffects && condition.sideEffects.length > 0) {
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
      this.getBlock().recursivelyApplyRuntimeCapture(frameData.block || [])
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotation
    mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)
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
    const data = capture.data as WhileLoopData
    this.runtimeCapture = data
    this.selectRuntimeCaptureFrame(this.runtimeCaptureFrame)
    return true
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
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_WHILE_LOOP
    typeRegistration.deserializer = PythonWhileLoop.deserializer
    typeRegistration.childSets = {
      condition: NodeCategory.PythonExpression,
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'while'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition', ['condition is true']),
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
    registerNodeCateogry(PYTHON_WHILE_LOOP, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new WhileGenerator())
  }
}
