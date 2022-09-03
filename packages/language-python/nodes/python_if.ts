import { IfNode, ParseNode, ParseNodeType, SuiteNode } from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  IfStatementData,
  SingleStatementData,
  StatementCapture,
} from '@splootcode/core/language/capture/runtime_capture'
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
import { PYTHON_ELIF_STATEMENT, PythonElifBlock } from './python_elif'
import { PYTHON_ELSE_STATEMENT, PythonElseBlock } from './python_else'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { registerFragmentAdapter } from '@splootcode/core/language/fragment_adapter'

export const PYTHON_IF_STATEMENT = 'PYTHON_IF_STATEMENT'

class IfGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonIfStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'if', 'if', true)
    return [suggestedNode]
  }
}

export class PythonIfStatement extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_IF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('trueblock', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getTrueBlock().addChild(new PythonStatement(null))
    this.addChildSet('elseblocks', ChildSetType.Many, NodeCategory.PythonElseBlock)
    this.childSetWrapPriorityOrder = ['trueblock', 'condition', 'elseblock']
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
    this.getTrueBlock().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        ifNode.ifSuite.statements.push(statement)
        statement.parent = ifNode.ifSuite
      }
    })
    let currentIf: IfNode = ifNode
    this.getElseBlocks().children.forEach((elseOrElseIf: PythonElseBlock | PythonElifBlock) => {
      const elseSuite = elseOrElseIf.generateParseTree(parseMapper) as IfNode | SuiteNode
      currentIf.elseSuite = elseSuite
      elseSuite.parent = currentIf
      if (elseSuite.nodeType === ParseNodeType.If) {
        currentIf = elseSuite
      }
    })
    return ifNode
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition', ['condition is true']),
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

    registerFragmentAdapter(NodeCategory.PythonElseBlock, PYTHON_IF_STATEMENT, (fragment: SplootFragment) => {
      const first = fragment.nodes[0]
      let remainder = []
      if (fragment.nodes.length !== 0) {
        remainder = fragment.nodes.slice(1)
      }

      const ifStatement = new PythonIfStatement(null)
      // if the first nodes is an elif - convert that to an if
      if (first.type === PYTHON_ELIF_STATEMENT) {
        const elif = first as PythonElifBlock
        ifStatement.getCondition().removeChild(0)
        ifStatement.getCondition().addChild(elif.getCondition().getChild(0))
        ifStatement.getTrueBlock().removeChild(0)
        elif.getBlock().children.forEach((statementNode) => {
          ifStatement.getTrueBlock().addChild(statementNode)
        })
      } else if (first.type === PYTHON_ELSE_STATEMENT) {
        // if the first node is an else - make it the if
        const elseBlock = first as PythonElseBlock
        ifStatement.getTrueBlock().removeChild(0)
        elseBlock.getBlock().children.forEach((statementNode) => {
          ifStatement.getTrueBlock().addChild(statementNode)
        })
      } else {
        // Not sure what this could be, but let's just keep it as remainder.
        remainder = fragment.nodes
      }

      remainder.forEach((node) => {
        ifStatement.getElseBlocks().addChild(node)
      })
      return ifStatement
    })
  }
}
