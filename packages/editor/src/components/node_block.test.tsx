/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'
import React from 'react'
import pretty from 'pretty'
import { act } from 'react-dom/test-utils'
import { render, unmountComponentAtNode } from 'react-dom'

import { PythonStringLiteral, loadPythonTypes } from '@splootcode/language-python'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'

let container: HTMLElement = null

beforeAll(() => {
  loadPythonTypes()
})

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  unmountComponentAtNode(container)
  container.remove()
  container = null
})

it('renders a single string literal node', () => {
  const node = new PythonStringLiteral(null, 'hello this is string')
  const nodeBlock = new NodeBlock(null, node, null, 0)
  nodeBlock.calculateDimensions(0, 0, null)

  act(() => {
    render(
      <svg height={nodeBlock.rowHeight + nodeBlock.indentedBlockHeight} width={nodeBlock.width}>
        <EditorNodeBlock block={nodeBlock} selectionState={NodeSelectionState.UNSELECTED} />
      </svg>,
      container
    )
  })
  expect(container.children).toHaveLength(1)
  expect(pretty(container.innerHTML)).toMatchInlineSnapshot(`
    "<svg height=\\"18\\" width=\\"40\\">
      <rect tabindex=\\"0\\" class=\\"string-node-background\\" x=\\"6\\" y=\\"0\\" width=\\"28\\" height=\\"18\\"></rect>
      <path tabindex=\\"0\\" class=\\"svgsplootnode stringnode\\" d=\\"M 4 0 q -4,0 -4,4 v 10 q 0,4 4,4 h 3 v -18 z\\"></path>
      <g transform=\\"translate(0 14)\\"><text class=\\"string-node-cap-text\\">'</text></g>
      <foreignObject x=\\"11\\" y=\\"0\\" width=\\"20\\" height=\\"18\\"><pre tabindex=\\"0\\" class=\\"string-node\\">hello this is string</pre>
      </foreignObject>
      <path tabindex=\\"0\\" class=\\"svgsplootnode stringnode\\" d=\\"M 33 0 v 18 h 3 q 4,0 4,-4 v -10 q 0,-4 -4,-4 z\\"></path>
      <g transform=\\"translate(33 14)\\"><text class=\\"string-node-cap-text\\">'</text></g>
    </svg>"
  `)
})
