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
    "<svg height=\\"20\\" width=\\"52\\">
      <path class=\\"svgsplootnode\\" d=\\"M 4 0 q -4,0 -4,4 v 12 q 0,4 4,4 h 10 v -20 z\\"></path>
      <g transform=\\"translate(4 6)\\">
        <path d=\\"M3.35332 5.18303C3.66921 4.4662 3.99117 3.70077 4.31922 2.88674C4.64726 2.07271 4.92063 1.3498 5.13932 0.718018H6.9071L6.98 0.918488C6.70056 1.56242 6.33607 2.2671 5.88653 3.03254C5.43699 3.79797 4.99353 4.5148 4.55614 5.18303H3.35332ZM0 5.18303C0.315892 4.4662 0.643934 3.70077 0.984125 2.88674C1.32432 2.07271 1.59769 1.3498 1.80423 0.718018H3.55379L3.62668 0.918488C3.33509 1.56242 2.9706 2.2671 2.53321 3.03254C2.09582 3.79797 1.65843 4.5148 1.22104 5.18303H0Z\\" fill=\\"var(--code-neutral-200)\\"></path>
      </g>
      <foreignObject x=\\"16\\" y=\\"0\\" width=\\"20\\" height=\\"20\\"><pre class=\\"string-node\\">hello this is string</pre>
      </foreignObject>
      <path class=\\"svgsplootnode\\" d=\\"M 38 0 v 20 h 10 q 4,0 4,-4 v -12 q 0,-4 -4,-4 z\\"></path>
      <g transform=\\"translate(41 6)\\">
        <path d=\\"M3.35332 5.18303C3.66921 4.4662 3.99117 3.70077 4.31922 2.88674C4.64726 2.07271 4.92063 1.3498 5.13932 0.718018H6.9071L6.98 0.918488C6.70056 1.56242 6.33607 2.2671 5.88653 3.03254C5.43699 3.79797 4.99353 4.5148 4.55614 5.18303H3.35332ZM0 5.18303C0.315892 4.4662 0.643934 3.70077 0.984125 2.88674C1.32432 2.07271 1.59769 1.3498 1.80423 0.718018H3.55379L3.62668 0.918488C3.33509 1.56242 2.9706 2.2671 2.53321 3.03254C2.09582 3.79797 1.65843 4.5148 1.22104 5.18303H0Z\\" fill=\\"var(--code-neutral-200)\\"></path>
      </g>
    </svg>"
  `)
})
