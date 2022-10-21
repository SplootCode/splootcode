/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'

import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory } from '@splootcode/core/language/node_category_registry'
import { NodeSelection, SelectionState } from '../context/selection'
import { PYTHON_STATEMENT, PythonStatement } from '@splootcode/language-python/nodes/python_statement'
import { PythonArgument } from '@splootcode/language-python/nodes/python_argument'
import { PythonAssignment } from '@splootcode/language-python/nodes/python_assignment'
import { PythonBinaryOperator } from '@splootcode/language-python/nodes/python_binary_operator'
import { PythonCallVariable } from '@splootcode/language-python/nodes/python_call_variable'
import { PythonExpression } from '@splootcode/language-python/nodes/python_expression'
import { PythonFile } from '@splootcode/language-python/nodes/python_file'
import { PythonIdentifier } from '@splootcode/language-python/nodes/python_identifier'
import { PythonIfStatement } from '@splootcode/language-python/nodes/python_if'
import { PythonScope } from '@splootcode/language-python/scope/python_scope'
import { PythonStringLiteral } from '@splootcode/language-python/nodes/python_string'
import { SplootFragment } from '@splootcode/core/language/fragment'
import { loadTypes } from '@splootcode/language-python/type_loader'

function getHelloWorldPythonFile(): PythonFile {
  const call = new PythonCallVariable(null, 'print')
  call.getArguments().addChild(new PythonArgument(null))
  const stringExpr = new PythonExpression(null)
  stringExpr.getTokenSet().addChild(new PythonStringLiteral(null, 'Hello, World!'))
  ;(call.getArguments().getChild(0) as PythonArgument).getArgument().addChild(stringExpr)

  const expr = new PythonExpression(null)
  expr.getTokenSet().addChild(call)

  const statement = new PythonStatement(null)
  statement.getStatement().addChild(expr)

  const file = new PythonFile(null)
  file.getBody().addChild(statement)
  return file
}

function getAssignStatement(variableName: string, stringValue: string): PythonStatement {
  const val = new PythonStringLiteral(null, stringValue)
  const variable = new PythonIdentifier(null, variableName)
  const assign = new PythonAssignment(null)
  assign.getLeft().addChild(variable)
  ;(assign.getRight().getChild(0) as PythonExpression).getTokenSet().addChild(val)
  const statement = new PythonStatement(null)
  statement.getStatement().addChild(assign)
  return statement
}

describe('python hello world file edits', () => {
  beforeAll(() => {
    loadTypes()
  })

  test('Test paste statements at start of expression line', () => {
    const file = getHelloWorldPythonFile()
    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    const scope = new PythonScope(null, null)
    scope.isGlobal = true
    const globalScope = scope
    file.recursivelyBuildScope(globalScope)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    selection.handleClick(0, 0, false)
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 0 })

    const statementFragment = new SplootFragment(
      [getAssignStatement('name', 'Fred'), getAssignStatement('foo', 'bar')],
      NodeCategory.PythonStatement
    )

    // Paste some statements at the start of the first line
    selection.insertFragment(statementFragment)
    // Expect 3 lines in the file now
    expect(file.getBody().getCount()).toBe(3)
    // The assignment nodes should've been wrapped in statements
    expect(file.getBody().getChild(0).type).toBe(PYTHON_STATEMENT)
    expect(file.getBody().getChild(1).type).toBe(PYTHON_STATEMENT)
    // Expect the cursor to be at the end of the pasted input
    expect(selection.cursor).toStrictEqual({ lineIndex: 2, entryIndex: 0 })
  })

  test('Test paste expression into if condition', () => {
    const file = getHelloWorldPythonFile()
    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    selection.handleClick(0, 0, false)
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 0 })

    const expr = new PythonExpression(null)
    const tokenSet = expr.getTokenSet()
    tokenSet.addChild(new PythonStringLiteral(null, 'hello'))
    tokenSet.addChild(new PythonBinaryOperator(null, '+'))
    tokenSet.addChild(new PythonStringLiteral(null, 'goodbye'))

    // Create a fragment from a single expression
    const expressionFragment = new SplootFragment([expr], NodeCategory.PythonExpression)
    // Check that it's stripped down to a fragment of tokens
    expect(expressionFragment.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(expressionFragment.nodes.length).toBe(3)

    // Move cursor to the line after the print()
    selection.moveCursorDown(false)
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 0 })
    // Type an if
    const ifStatement = new PythonIfStatement(null)
    selection.insertNodeByChildSet(file.getBody(), 1, ifStatement)
    // Expect the cursor to be inside the if() condition
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 2 })
    expect(file.getBody().getCount()).toBe(2)

    // Paste an expression into the if
    selection.insertFragment(expressionFragment)
    // Ensure the if statement condition still has only 1 expression
    expect(ifStatement.getCondition().getCount()).toBe(1)
    // If condition now has 3 tokens in the expression
    const tokens = (ifStatement.getCondition().getChild(0) as PythonExpression).getTokenSet()
    expect(tokens.getCount()).toBe(3)
    // Expect the cursor to be at the end of the inserted tokens
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 8 })
  })
})
