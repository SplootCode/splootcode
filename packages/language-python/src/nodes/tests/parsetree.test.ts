import { ParseMapper } from '../../analyzer/python_analyzer'
import { ParseNodeType, isExpressionNode } from 'structured-pyright'
import { PythonNode } from '../python_node'
import { PythonStatement } from '../python_statement'
import { TestWalker } from './tree_walker'
import { beforeAll, describe, expect, test } from '@jest/globals'
import { getEmptyStatementNodes } from './single_examples'
import { loadPythonTypes } from '../../type_loader'

describe('python parse tree generation', () => {
  beforeAll(() => {
    loadPythonTypes()
  })

  test('statement nodes generate valid parse trees', () => {
    const examples: PythonNode[] = getEmptyStatementNodes()
    examples.forEach((node) => {
      const statement = new PythonStatement(null)
      statement.getStatement().addChild(node)
      const parseTree = statement.generateParseTree(new ParseMapper())
      expect(parseTree).not.toBe(null)
      expect(parseTree).toBeDefined()

      const validStatementNodes = [
        ParseNodeType.If,
        ParseNodeType.While,
        ParseNodeType.For,
        ParseNodeType.Try,
        ParseNodeType.Function,
        ParseNodeType.Class,
        ParseNodeType.With,
        ParseNodeType.StatementList,
        ParseNodeType.Match,
        ParseNodeType.Error,
      ]

      expect(validStatementNodes).toContain(parseTree.nodeType)

      if (parseTree.nodeType === ParseNodeType.StatementList) {
        const validStatementListNodes = [
          ParseNodeType.Assignment,
          ParseNodeType.Break,
          ParseNodeType.Continue,
          ParseNodeType.Del,
          ParseNodeType.Pass,
          ParseNodeType.Import,
          ParseNodeType.ImportFrom,
          ParseNodeType.Global,
          ParseNodeType.Nonlocal,
          ParseNodeType.Assert,
          ParseNodeType.Return,
        ]
        parseTree.statements.forEach((statementNode) => {
          // Must either be an expression node or another small statement node
          if (!isExpressionNode(statementNode) && !validStatementListNodes.includes(statementNode.nodeType)) {
            throw new Error(
              `Statement type ${node.type} generated an invalid small statement parse node type: ${statementNode.nodeType}`
            )
          }
        })
      }

      const testWalker = new TestWalker()
      testWalker.walk(parseTree)
    })
  })
})
