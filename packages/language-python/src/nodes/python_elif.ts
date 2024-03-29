import {
  ChildSetType,
  ElseIfStatementData,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeAnnotation,
  NodeAnnotationType,
  NodeCategory,
  NodeLayout,
  NodeMutation,
  NodeMutationType,
  ParentReference,
  SerializedNode,
  SingleStatementData,
  SplootFragment,
  SplootNode,
  StatementCapture,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  getSideEffectAnnotations,
  registerAutocompleter,
  registerLastResortFragmentAdapater,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { IfNode, ParseNode, ParseNodeType } from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonIfStatement } from './python_if'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'

export const PYTHON_ELIF_STATEMENT = 'PYTHON_ELIF_STATEMENT'

class InsertElifGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonElifBlock(null)
    return [new SuggestedNode(node, `else if`, `elif`, true, 'Else-if block')]
  }
}

export class PythonElifBlock extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ELIF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getChildSet('block').addChild(new PythonStatement(null))
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const ifNode: IfNode = {
      nodeType: ParseNodeType.If,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      testExpression: (this.getCondition().getChild(0) as PythonExpression).generateParseTree(parseMapper),
      ifSuite: {
        nodeType: ParseNodeType.Suite,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
        statements: [],
      },
    }
    if (ifNode.testExpression) {
      ifNode.testExpression.parent = ifNode
    }
    ifNode.ifSuite.parent = ifNode
    this.getBlock().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        ifNode.ifSuite.statements.push(statement)
        statement.parent = ifNode.ifSuite
      }
    })
    return ifNode
  }

  validateSelf(): void {
    ;(this.getCondition().getChild(0) as PythonExpression).requireNonEmpty('If condition is required')
  }

  recursivelySetLineNumbers(lineNumber: number): number {
    this.metadata.set('lineno', lineNumber)
    lineNumber += 1
    for (const child of this.getBlock().getChildren()) {
      lineNumber = child.recursivelySetLineNumbers(lineNumber)
    }
    return lineNumber
  }

  getChildNodeByLineNumber(lineNumber: number): SplootNode {
    if (this.metadata.get('lineno') === lineNumber) {
      return this
    }
    for (const child of this.getBlock().getChildren()) {
      const res = child.getChildNodeByLineNumber(lineNumber)
      if (res) {
        return res
      }
    }
    return null
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      this.getBlock().recursivelyClearRuntimeCapture()
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      this.recursivelyClearRuntimeCapture()
      return false
    }
    const data = capture.data as ElseIfStatementData
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
    this.getBlock().recursivelyApplyRuntimeCapture(data.block || [])
    return true
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
    this.getBlock().recursivelyClearRuntimeCapture()
  }

  static deserializer(serializedNode: SerializedNode): PythonElifBlock {
    const node = new PythonElifBlock(null)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ELIF_STATEMENT
    typeRegistration.deserializer = PythonElifBlock.deserializer
    typeRegistration.childSets = {
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'else if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition', ['condition is true']),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_IF_STATEMENT: (node: PythonElifBlock) => {
        const ifStatement = new PythonIfStatement(null)
        ifStatement.getCondition().removeChild(0)
        ifStatement.getCondition().addChild(node.getCondition().getChild(0))
        ifStatement.getTrueBlock().removeChild(0)
        node.getBlock().children.forEach((node) => {
          ifStatement.getTrueBlock().addChild(node)
        })
        return ifStatement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ELIF_STATEMENT, NodeCategory.PythonElseBlock)
    registerAutocompleter(NodeCategory.PythonElseBlock, new InsertElifGenerator())
    registerLastResortFragmentAdapater(
      NodeCategory.PythonStatement,
      PYTHON_ELIF_STATEMENT,
      (fragment: SplootFragment) => {
        const elifNode = new PythonElifBlock(null)
        fragment.nodes.forEach((node) => {
          elifNode.getBlock().addChild(node)
        })
        elifNode.getBlock().removeChild(0)
        return elifNode
      }
    )
    registerLastResortFragmentAdapater(
      NodeCategory.PythonExpression,
      PYTHON_ELIF_STATEMENT,
      (fragment: SplootFragment) => {
        const elifNode = new PythonElifBlock(null)
        fragment.nodes.forEach((node) => {
          const statement = new PythonStatement(null)
          statement.getStatement().addChild(node)
          elifNode.getBlock().addChild(statement)
        })
        elifNode.getBlock().removeChild(0)
        return elifNode
      }
    )
  }
}
