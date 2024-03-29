import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  StatementCapture,
  TypeRegistration,
  registerAutocompleteAdapter,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParseMapper } from '../analyzer/python_analyzer'
import { ParseNodeType, StatementListNode, StatementNode } from 'structured-pyright'
import { PythonElifBlock } from './python_elif'
import { PythonNode } from './python_node'

export const PYTHON_STATEMENT = 'PYTHON_STATEMENT'

const statementNodes = [
  ParseNodeType.If,
  ParseNodeType.While,
  ParseNodeType.For,
  ParseNodeType.Try,
  ParseNodeType.Function,
]

export class PythonStatement extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_STATEMENT)
    this.addChildSet('statement', ChildSetType.Single, NodeCategory.PythonStatementContents)
  }

  getStatement() {
    return this.getChildSet('statement')
  }

  clean() {
    if (this.getStatement().getCount() !== 0) {
      const statement = this.getStatement().getChild(0)
      if (statement.type === PYTHON_EXPRESSION && (statement as PythonExpression).getTokenSet().getCount() === 0) {
        this.getStatement().removeChild(0)
      }
    }
  }

  generateParseTree(parseMapper: ParseMapper): StatementNode {
    if (this.isEmpty()) {
      return null
    }
    const child = this.getStatement().getChild(0)
    const childParseNode = (child as PythonNode).generateParseTree(parseMapper)
    if (!childParseNode) {
      // Expected for some nodes (like comments)
      return null
    }
    if (childParseNode && statementNodes.includes(childParseNode.nodeType)) {
      return childParseNode as StatementNode
    }
    const statementList: StatementListNode = {
      nodeType: ParseNodeType.StatementList,
      statements: [],
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
    }
    statementList.statements.push(childParseNode)
    childParseNode.parent = statementList
    return statementList
  }

  isEmpty(): boolean {
    return this.getStatement().children.length === 0
  }

  recursivelySetLineNumbers(lineNumber: number) {
    this.metadata.set('lineno', lineNumber)
    if (this.getStatement().getCount() !== 0) {
      const child = this.getStatement().getChild(0)
      lineNumber = child.recursivelySetLineNumbers(lineNumber)
    } else {
      lineNumber += 1
    }
    return lineNumber
  }

  getChildNodeByLineNumber(lineNumber: number): SplootNode {
    if (this.metadata.get('lineno') === lineNumber) {
      return this
    }
    if (this.getStatement().getCount() !== 0) {
      const child = this.getStatement().getChild(0)
      const res = child.getChildNodeByLineNumber(lineNumber)
      if (res) {
        return res
      }
    }
    return null
  }

  static deserializer(serializedNode: SerializedNode): PythonStatement {
    const res = new PythonStatement(null)
    res.deserializeChildSet('statement', serializedNode)
    res.clean()
    return res
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (this.getStatement().getCount() !== 0) {
      const child = this.getStatement().getChild(0)
      return child.recursivelyApplyRuntimeCapture(capture)
    }
    return false
  }

  applyRuntimeError(capture: StatementCapture): void {
    if (this.getStatement().getCount() !== 0) {
      const child = this.getStatement().getChild(0)
      child.applyRuntimeError(capture)
    }
  }

  recursivelyClearRuntimeCapture() {
    if (this.getStatement().getCount() !== 0) {
      this.getStatement().getChild(0).recursivelyClearRuntimeCapture()
    }
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_STATEMENT
    typeRegistration.deserializer = PythonStatement.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = { statement: NodeCategory.PythonStatementContents }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.NONE,
      [new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'statement')],
      NodeBoxType.INVISIBLE
    )
    typeRegistration.pasteAdapters = {
      PYTHON_ELIF_STATEMENT: (node: SplootNode) => {
        const elif = new PythonElifBlock(null)
        elif.getBlock().addChild(node)
        elif.getBlock().removeChild(0)
        return elif
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_STATEMENT, NodeCategory.PythonStatement)

    registerAutocompleteAdapter(NodeCategory.PythonStatement, NodeCategory.PythonStatementContents)

    registerBlankFillForNodeCategory(NodeCategory.PythonStatement, () => {
      return new PythonStatement(null)
    })
  }
}
