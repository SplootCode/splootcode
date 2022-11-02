import './string_literal.css'

import React from 'react'

import { NODE_TEXT_OFFSET } from '../layout/layout_constants'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'

interface StringLiteralProps {
  block: NodeBlock
  leftPos: number
  topPos: number
  propertyName: string
  selectState: NodeSelectionState
}

export class InlineStringLiteral extends React.Component<StringLiteralProps> {
  render() {
    const { block, propertyName, selectState, leftPos, topPos } = this.props
    const { node } = this.props.block
    const isEditing = selectState === NodeSelectionState.EDITING
    const className = isEditing ? 'editing' : ''

    return (
      <text
        className={'string-literal ' + className}
        x={leftPos}
        y={topPos + NODE_TEXT_OFFSET}
        style={{ fill: block.textColor }}
        xmlSpace="preserve"
      >
        &quot;{node.getProperty(propertyName)}&quot;
      </text>
    )
  }
}
