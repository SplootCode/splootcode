/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'

import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory } from '@splootcode/core/language/node_category_registry'
import { NodeSelection } from '../context/selection'
import { PYTHON_CALL_MEMBER, PythonCallMember } from '@splootcode/language-python/nodes/python_call_member'
import { PYTHON_STATEMENT, PythonStatement } from '@splootcode/language-python/nodes/python_statement'
import { PYTHON_STRING, PythonStringLiteral } from '@splootcode/language-python/nodes/python_string'
import { PythonArgument } from '@splootcode/language-python/nodes/python_argument'
import { PythonCallVariable } from '@splootcode/language-python/nodes/python_call_variable'
import { PythonExpression } from '@splootcode/language-python/nodes/python_expression'
import { PythonFile } from '@splootcode/language-python/nodes/python_file'
import { loadTypes } from '@splootcode/language-python/type_loader'

function getArg(expr: PythonExpression): PythonArgument {
  const arg = new PythonArgument(null)
  arg.getArgument().addChild(expr)
  return arg
}
function getExpressionFromString(s: string): PythonExpression {
  const expr = new PythonExpression(null)
  expr.getTokenSet().addChild(new PythonStringLiteral(null, s))
  return expr
}

function getBreadcrumbsTestFile(): PythonFile {
  const call = new PythonCallVariable(null, 'print')
  call.getArguments().addChild(new PythonArgument(null))
  const stringExpr = new PythonExpression(null)
  stringExpr.getTokenSet().addChild(new PythonStringLiteral(null, 'Hello'))
  ;(call.getArguments().getChild(0) as PythonArgument).getArgument().addChild(stringExpr)

  const expr = new PythonExpression(null)
  expr.getTokenSet().addChild(call)

  const statement = new PythonStatement(null)
  statement.getStatement().addChild(expr)

  const file = new PythonFile(null)
  file.getBody().addChild(statement)

  const replaceCall = new PythonCallMember(null)
  replaceCall.getObjectExpressionToken().addChild(new PythonStringLiteral(null, 'Some sentence from you'))
  replaceCall.setMember('replace')
  replaceCall.getArguments().addChild(getArg(getExpressionFromString('from')))
  replaceCall.getArguments().addChild(getArg(getExpressionFromString('to')))

  const lowerCall = new PythonCallMember(null)
  lowerCall.setMember('lower')
  lowerCall.getObjectExpressionToken().addChild(replaceCall)

  const expr2 = new PythonExpression(null)
  expr2.getTokenSet().addChild(lowerCall)

  const statement2 = new PythonStatement(null)
  statement2.getStatement().addChild(expr2)

  file.getBody().addChild(statement2)

  return file
}

describe('python hello world file edits', () => {
  beforeAll(() => {
    loadTypes()
  })

  test('Right arrow incrementally selects chained method calls.', () => {
    const file = getBreadcrumbsTestFile()
    const statement = file.getBody().getChild(1) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const lowerCall = expr.getTokenSet().getChild(0) as PythonCallMember
    expect(lowerCall.type).toBe(PYTHON_CALL_MEMBER)

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor after the string node.
    selection.placeCursorPosition({ lineIndex: 1, entryIndex: 0 }, true)
    selection.editSelectionRight()

    const fragment1 = selection.copyCurrentSelection()
    expect(fragment1.isSingle()).toBe(true)
    expect(fragment1.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment1.nodes[0].type).toBe(PYTHON_STRING)

    selection.editSelectionRight()
    const fragment2 = selection.copyCurrentSelection()
    expect(fragment2.isSingle()).toBe(true)
    expect(fragment2.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment2.nodes[0].type).toBe(PYTHON_CALL_MEMBER)
    expect((fragment2.nodes[0] as PythonCallMember).getMember()).toBe('replace')
    expect((fragment2.nodes[0] as PythonCallMember).getArguments().getCount()).toBe(0)
    expect((fragment2.nodes[0] as PythonCallMember).getObjectExpressionToken().getCount()).toBe(1)

    selection.editSelectionRight()
    const fragment3 = selection.copyCurrentSelection()
    expect(fragment3.isSingle()).toBe(true)
    expect(fragment3.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment3.nodes[0].type).toBe(PYTHON_CALL_MEMBER)
    expect((fragment3.nodes[0] as PythonCallMember).getMember()).toBe('replace')
    expect((fragment3.nodes[0] as PythonCallMember).getArguments().getCount()).toBe(1)
    expect((fragment3.nodes[0] as PythonCallMember).getObjectExpressionToken().getCount()).toBe(1)

    selection.editSelectionRight()
    const fragment4 = selection.copyCurrentSelection()
    expect(fragment4.isSingle()).toBe(true)
    expect(fragment4.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment4.nodes[0].type).toBe(PYTHON_CALL_MEMBER)
    expect((fragment4.nodes[0] as PythonCallMember).getMember()).toBe('lower')

    const replaceCall = (fragment4.nodes[0] as PythonCallMember)
      .getObjectExpressionToken()
      .getChild(0) as PythonCallMember
    expect(replaceCall.getMember()).toBe('replace')
    expect(replaceCall.getArguments().getCount()).toBe(2)
    expect(replaceCall.getObjectExpressionToken().getCount()).toBe(1)
  })

  test('Can delete objects of methods without deleting the method.', () => {
    const file = getBreadcrumbsTestFile()
    const statement = file.getBody().getChild(1) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const lowerCall = expr.getTokenSet().getChild(0) as PythonCallMember
    expect(lowerCall.type).toBe(PYTHON_CALL_MEMBER)

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor before the string node.
    selection.placeCursorPosition({ lineIndex: 1, entryIndex: 0 }, true)
    selection.editSelectionRight()
    selection.editSelectionRight()

    const fragment2 = selection.copyCurrentSelection()
    expect(fragment2.isSingle()).toBe(true)
    expect(fragment2.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment2.nodes[0].type).toBe(PYTHON_CALL_MEMBER)
    expect((fragment2.nodes[0] as PythonCallMember).getMember()).toBe('replace')
    expect((fragment2.nodes[0] as PythonCallMember).getArguments().getCount()).toBe(0)
    expect((fragment2.nodes[0] as PythonCallMember).getObjectExpressionToken().getCount()).toBe(1)

    selection.deleteSelectedNode()
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 1 })
    expect(lowerCall.getObjectExpressionToken().getCount()).toBe(0)
  })

  test('Can delete methods without deleting the object.', () => {
    const file = getBreadcrumbsTestFile()
    const statement = file.getBody().getChild(1) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const lowerCall = expr.getTokenSet().getChild(0) as PythonCallMember
    expect(lowerCall.type).toBe(PYTHON_CALL_MEMBER)

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor after the string node.
    selection.placeCursorPosition({ lineIndex: 1, entryIndex: 0 }, true)
    selection.moveCursorToEndOfLine(false)
    selection.editSelectionLeft()
    selection.editSelectionLeft()

    const fragment1 = selection.copyCurrentSelection()
    // In reality the arguments of the replace are selected too, but they get dropped here
    // because of lossy fragment combination.

    expect(fragment1.isSingle()).toBe(true)
    expect(fragment1.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment1.nodes[0].type).toBe(PYTHON_CALL_MEMBER)
    expect((fragment1.nodes[0] as PythonCallMember).getMember()).toBe('lower')
    expect((fragment1.nodes[0] as PythonCallMember).getArguments().getCount()).toBe(0)
    expect((fragment1.nodes[0] as PythonCallMember).getObjectExpressionToken().getCount()).toBe(0)

    selection.deleteSelectedNode()
    // Should be at end of the line
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 4 })
    // Only thing in the expression should be the replace call.
    expect(expr.getTokenSet().getChild(0).type).toBe(PYTHON_CALL_MEMBER)
    const replaceCall = expr.getTokenSet().getChild(0) as PythonCallMember
    expect(replaceCall.getMember()).toBe('replace')
    expect(replaceCall.getObjectExpressionToken().getCount()).toBe(1)
    expect(replaceCall.getArguments().getCount()).toBe(1)
    expect(replaceCall.getArguments().getChild(0).isEmpty()).toBe(true)
  })

  test('Down arrow selects whole lines.', () => {
    const file = getBreadcrumbsTestFile()
    const statement = file.getBody().getChild(1) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const lowerCall = expr.getTokenSet().getChild(0) as PythonCallMember
    expect(lowerCall.type).toBe(PYTHON_CALL_MEMBER)

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor before the string node.
    selection.placeCursorPosition({ lineIndex: 0, entryIndex: 0 }, true)
    selection.editSelectionDown()

    const fragment1 = selection.copyCurrentSelection()
    expect(fragment1.nodes.length).toBe(2)
    expect(fragment1.nodeCategory).toBe(NodeCategory.PythonStatement)
    expect(fragment1.nodes[0].type).toBe(PYTHON_STATEMENT)
    expect(fragment1.nodes[1].type).toBe(PYTHON_STATEMENT)

    selection.editSelectionDown()
    const fragment2 = selection.copyCurrentSelection()
    expect(fragment2.nodes.length).toBe(2)
    expect(fragment2.nodeCategory).toBe(NodeCategory.PythonStatement)
    expect(fragment2.nodes[0].type).toBe(PYTHON_STATEMENT)
    expect(fragment2.nodes[1].type).toBe(PYTHON_STATEMENT)
  })
})
