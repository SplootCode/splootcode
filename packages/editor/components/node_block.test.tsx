/**
 * @jest-environment jsdom
 */
import 'jest-canvas-mock'
import React from 'react'
import pretty from 'pretty'
import { act } from 'react-dom/test-utils'
import { render, unmountComponentAtNode } from 'react-dom'

import { PythonStringLiteral } from '@splootcode/language-python/nodes/python_string'
import { loadTypes } from '@splootcode/language-python/type_loader'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'

let container: HTMLElement = null

beforeAll(() => {
  loadTypes()
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
    "<svg height=\\"20\\" width=\\"30\\">
      <g>
        <path class=\\"svgsplootnode\\" d=\\"M 4 0 q -4,0 -4,4 v 12 q 0,4 4,4 h 22 q 4,0 4,-4 v -12 q 0,-4 -4,-4 z\\"></path><text class=\\"string-literal \\" x=\\"4\\" y=\\"15\\" style=\\"fill: var(--code-green-200);\\" xml:space=\\"preserve\\">\\"hello this is string\\"</text>
      </g>
    </svg>"
  `)
})
