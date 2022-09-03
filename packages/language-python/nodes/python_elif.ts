import { ChildSetType } from '@splootcode/core/language/childset'
import {
  ElseIfStatementData,
  SingleStatementData,
  StatementCapture,
} from '@splootcode/core/language/capture/runtime_capture'
import { HighlightColorCategory } from '@splootcode/core/colors'
import { IfNode, ParseNode, ParseNodeType } from 'structured-pyright'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeAnnotation,
  NodeAnnotationType,
  getSideEffectAnnotations,
} from '@splootcode/core/language/annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { NodeMutation, NodeMutationType } from '@splootcode/core/language/mutations/node_mutations'
import { ParentReference } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonIfStatement } from './python_if'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { registerLastResortFragmentAdapater } from '@splootcode/core/language/fragment_adapter'

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

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
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

    const blockChildren = this.getBlock().children
    let i = 0
    if (data.block) {
      const blockData = data.block
      for (; i < blockData.length; i++) {
        blockChildren[i].recursivelyApplyRuntimeCapture(blockData[i])
      }
    }
    if (i < blockChildren.length) {
      for (; i < blockChildren.length; i++) {
        blockChildren[i].recursivelyClearRuntimeCapture()
      }
    }
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
