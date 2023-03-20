/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'

import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory } from '@splootcode/core'
import { NodeSelection } from '../context/selection'
import {
  PYTHON_DICT,
  PYTHON_EXPRESSION,
  PYTHON_STRING,
  PythonDictionary,
  PythonExpression,
  PythonFile,
  PythonKeyValue,
  PythonStatement,
  PythonStringLiteral,
  loadPythonTypes,
} from '@splootcode/language-python'

function getExpressionFromString(s: string): PythonExpression {
  const expr = new PythonExpression(null)
  expr.getTokenSet().addChild(new PythonStringLiteral(null, s))
  return expr
}

function generateKeyValuePair(key: string, value: string): PythonKeyValue {
  const entry = new PythonKeyValue(null)
  entry.getKey().removeChild(0)
  entry.getKey().addChild(getExpressionFromString(key))
  entry.getValue().removeChild(0)
  entry.getValue().addChild(getExpressionFromString(value))
  return entry
}

function getDictionaryTestFile(): PythonFile {
  const dictLiteral = new PythonDictionary(null)
  const entry1 = generateKeyValuePair('key1', 'value1')
  const entry2 = generateKeyValuePair('key2', 'value2')

  dictLiteral.getElements().removeChild(0)
  dictLiteral.getElements().addChild(entry1)
  dictLiteral.getElements().addChild(entry2)

  const dictExpression = new PythonExpression(null)
  dictExpression.getTokenSet().addChild(dictLiteral)

  const statement = new PythonStatement(null)
  statement.getStatement().addChild(dictExpression)

  const file = new PythonFile(null)
  file.getBody().addChild(statement)
  return file
}

describe('python dictionary literal edits', () => {
  beforeAll(() => {
    loadPythonTypes()
  })

  test('Select and delete second key-value pair', () => {
    const file = getDictionaryTestFile()
    const statement = file.getBody().getChild(0) as PythonStatement
    const expr = statement.getStatement().getChild(0) as PythonExpression
    const dictLiteral = expr.getTokenSet().getChild(0) as PythonDictionary
    expect(dictLiteral.type).toBe(PYTHON_DICT)

    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    // Place cursor at the start of the second entry in the dictionary
    selection.placeCursorPosition({ lineIndex: 1, entryIndex: 0 }, true)

    // Select 1 position to the right, this selects the key part of the key-value.
    selection.editSelectionRight()
    const fragment1 = selection.copyCurrentSelection()
    expect(fragment1.isSingle()).toBe(true)
    expect(fragment1.nodeCategory).toBe(NodeCategory.PythonExpressionToken)
    expect(fragment1.nodes[0].type).toBe(PYTHON_STRING)

    // Select 1 position to the right, this adds the value part of the key-value.
    selection.editSelectionRight()
    const fragment2 = selection.copyCurrentSelection()
    expect(fragment2.isSingle()).toBe(false)
    // Selection is now two expressions, the key and the value.
    expect(fragment2.nodeCategory).toBe(NodeCategory.PythonExpression)
    expect(fragment2.nodes[0].type).toBe(PYTHON_EXPRESSION)
    expect(fragment2.nodes[1].type).toBe(PYTHON_EXPRESSION)

    // Deleting here used to cause an error.
    selection.deleteSelectedNode()

    // The dict still has two elements.
    expect(dictLiteral.getElements().getCount()).toBe(2)

    // Check that the first key-value pair is still there.
    const entry1 = dictLiteral.getElements().getChild(0) as PythonKeyValue
    expect((entry1.getKey().getChild(0) as PythonExpression).getTokenSet().getCount()).toBe(1)
    expect((entry1.getValue().getChild(0) as PythonExpression).getTokenSet().getCount()).toBe(1)

    // Second key-value pair should be empty.
    const entry2 = dictLiteral.getElements().getChild(1) as PythonKeyValue
    expect((entry2.getKey().getChild(0) as PythonExpression).getTokenSet().getCount()).toBe(0)
    expect((entry2.getValue().getChild(0) as PythonExpression).getTokenSet().getCount()).toBe(0)
  })
})
