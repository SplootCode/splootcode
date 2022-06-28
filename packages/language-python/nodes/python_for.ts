import { ExpressionNode, ForNode, ParseNodeType, SuiteNode } from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import {
  ForLoopData,
  ForLoopIteration,
  SingleStatementData,
  StatementCapture,
} from '@splootcode/core/language/capture/runtime_capture'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { NodeAnnotation, NodeAnnotationType } from '@splootcode/core/language/annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { parseToPyright } from './utils'

export const PYTHON_FOR_LOOP = 'PYTHON_FOR_LOOP'

class ForGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonForLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for', 'for', true)
    return [suggestedNode]
  }
}

export class PythonForLoop extends PythonNode {
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
    this.addChildSet('iterable', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getChildSet('iterable').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getChildSet('block').addChild(new PythonStatement(null))
    this.childSetWrapPriorityOrder = ['block', 'target', 'iterable']
  }

  getTarget() {
    return this.getChildSet('target')
  }

  generateParseTree(parseMapper: ParseMapper): ForNode {
    const forSuite: SuiteNode = {
      nodeType: ParseNodeType.Suite,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      statements: [],
    }
    this.getBlock().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        forSuite.statements.push(statement)
        statement.parent = forSuite
      }
    })
    const iterableExpression: ExpressionNode = (this.getIterable().getChild(0) as PythonExpression).generateParseTree(
      parseMapper
    )
    const targetExpression: ExpressionNode = parseToPyright(parseMapper, this.getTarget().children)
    const forNode: ForNode = {
      nodeType: ParseNodeType.For,
      forSuite: forSuite,
      id: parseMapper.getNextId(),
      iterableExpression: iterableExpression,
      targetExpression: targetExpression,
      start: 0,
      length: 0,
    }
    targetExpression.parent = forNode
    iterableExpression.parent = forNode
    forSuite.parent = forNode
    return forNode
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'target', ['item']),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable', ['iterable']),
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
