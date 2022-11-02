/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'

import {
  AssignmentWrapGenerator,
  PYTHON_ARGUMENT,
  PYTHON_ASSIGNMENT,
  PYTHON_CALL_VARIABLE,
  PYTHON_EXPRESSION,
  PYTHON_STATEMENT,
  PYTHON_STRING,
  PythonArgument,
  PythonCallVariable,
  PythonExpression,
  PythonFile,
  PythonStatement,
  PythonStringLiteral,
  loadPythonTypes,
} from '@splootcode/language-python'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection, SelectionState } from '../context/selection'
import { checkNodeObserversRecursively } from './check_observer_mapping'

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

describe('python hello world file edits', () => {
  beforeAll(() => {
    loadPythonTypes()
  })

  test('Test hello world is as expected', () => {
    const file = getHelloWorldPythonFile()
    const statemnt = file.getBody().getChild(0) as PythonStatement
    expect(statemnt.type).toBe(PYTHON_STATEMENT)

    const expr = statemnt.getStatement().getChild(0) as PythonExpression
    expect(expr.type).toBe(PYTHON_EXPRESSION)

    const printCall = expr.getTokenSet().getChild(0) as PythonCallVariable
    expect(printCall.type).toBe(PYTHON_CALL_VARIABLE)
    expect(printCall.getArguments().getCount()).toBe(1)
    const argExpr = printCall.getArguments().getChild(0) as PythonArgument
    expect(argExpr.type).toBe(PYTHON_ARGUMENT)
    const expr2 = argExpr.getArgument().getChild(0) as PythonExpression
    expect(expr2.type).toBe(PYTHON_EXPRESSION)

    const strNode = expr2.getTokenSet().getChild(0) as PythonStringLiteral
    expect(strNode.type).toBe(PYTHON_STRING)
    expect(strNode.getValue()).toBe('Hello, World!')
  })

  test('move cursor right through all positions', () => {
    const file = getHelloWorldPythonFile()
    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)

    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor at start of the line
    selection.handleClick(0, 0, false)
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 0 })

    // Move to print node
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.SingleNode)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 1 })
    expect(selection.isSingleNode()).toEqual(true)

    // Move to inside print(
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 2 })

    // Move to string node
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.SingleNode)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 3 })
    expect(selection.isSingleNode()).toEqual(true)

    // Move to after string node
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 4 })

    // Move to after print()
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 5 })

    // Move to next line
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 0 })

    // Moving right again has no effect
    selection.moveCursorRight()
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 1, entryIndex: 0 })
  })

  test('Backspace to delete string node and print', () => {
    const file = getHelloWorldPythonFile()
    const statement = file.getBody().getChild(0) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const printCall = expr.getTokenSet().getChild(0) as PythonCallVariable
    const arg = printCall.getArguments().getChild(0) as PythonArgument
    const argExpr = arg.getArgument().getChild(0) as PythonExpression

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor after the string node.
    selection.placeCursorPosition({ lineIndex: 0, entryIndex: 4 }, true)
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 4 })

    expect(argExpr.getTokenSet().getCount()).toEqual(1)

    // Backspace to delete string
    selection.backspace()

    // String node is gone from expression
    expect(argExpr.getTokenSet().getCount()).toEqual(0)

    // Cursor is at start of print
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 2 })

    // Select print node
    selection.moveCursorLeft()
    expect(selection.state).toStrictEqual(SelectionState.SingleNode)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 1 })

    // Delete it.
    selection.backspace()

    // Statement is now empty
    expect(statement.getStatement().getCount()).toEqual(0)

    // Cursor is back to the start
    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 0 })
    expect(selection.cursorMap.lines[0].entries).toHaveLength(1)
  })

  test('wrap does not duplicate watchers', () => {
    const file = getHelloWorldPythonFile()
    const statement = file.getBody().getChild(0) as PythonStatement

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor at the start of the line
    selection.placeCursorPosition({ lineIndex: 0, entryIndex: 0 }, true)

    const cursors = selection.getAutocompleteNodeCursors()
    expect(cursors).toHaveLength(1)
    const cursor = cursors[0]

    // Generate autocompleted assignment node for wrapping
    const assignmentWrapGenerator = new AssignmentWrapGenerator()
    const suggestions = assignmentWrapGenerator.staticSuggestions(
      cursor.listBlock.childSet.getParentRef(),
      cursor.index
    )
    expect(suggestions).toHaveLength(1)
    const suggestedNode = suggestions[0]

    expect(suggestedNode.node.type).toEqual(PYTHON_ASSIGNMENT)
    const node = suggestedNode.node.clone()
    // Use the suggestion to perform a wrap operation!
    selection.wrapNode(
      suggestedNode.overrideLocationChildSet,
      suggestedNode.overrideLocationIndex,
      node,
      suggestedNode.wrapChildSetId
    )

    expect(statement.getStatement().getChild(0).type).toEqual(PYTHON_ASSIGNMENT)

    expect(selection.state).toStrictEqual(SelectionState.Cursor)
    expect(selection.cursor).toStrictEqual({ lineIndex: 0, entryIndex: 2 })

    // Check that all nodes/childsets have only one NodeBlock/RenderedChildSet watching
    checkNodeObserversRecursively(file)
  })
})
