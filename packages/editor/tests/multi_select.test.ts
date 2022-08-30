/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'

import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from '../context/selection'
import { PYTHON_CALL_VARIABLE, PythonCallVariable } from '@splootcode/language-python/nodes/python_call_variable'
import { PythonExpression } from '@splootcode/language-python/nodes/python_expression'
import { PythonFile } from '@splootcode/language-python/nodes/python_file'
import { PythonStatement } from '@splootcode/language-python/nodes/python_statement'
import { PythonStringLiteral } from '@splootcode/language-python/nodes/python_string'
import { loadTypes } from '@splootcode/language-python/type_loader'

function getHelloWorldPythonFile(): PythonFile {
  const call = new PythonCallVariable(null, 'print')
  ;(call.getArguments().getChild(0) as PythonExpression)
    .getTokenSet()
    .addChild(new PythonStringLiteral(null, 'Hello, World!'))

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
    loadTypes()
  })

  test('Test delete print but keep hello world', () => {
    const file = getHelloWorldPythonFile()
    const selection = new NodeSelection()
    const renderedNode = new NodeBlock(null, file, selection, 0)
    renderedNode.calculateDimensions(0, 0, null)
    selection.setRootNode(renderedNode)
    file.recursivelySetMutations(true)

    selection.handleClick(0, 0)
    selection.expandSelectionRight()

    const fragment = selection.getSelectedFragment()
    expect(fragment.nodes.length).toBe(1)
    expect(fragment.nodes[0].type).toBe(PYTHON_CALL_VARIABLE)
    const printcall = fragment.nodes[0] as PythonCallVariable
    expect(printcall.getArguments().getCount()).toBe(1)
  })
})
