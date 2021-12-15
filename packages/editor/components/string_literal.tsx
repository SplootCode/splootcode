import './string_literal.css'

import React from 'react'

import { NodeSelection, NodeSelectionState } from '../context/selection'
import { NodeBlock } from '../layout/rendered_node'

interface StringLiteralProps {
  block: NodeBlock
  leftPos: number
  topPos: number
  propertyName: string
  selectState: NodeSelectionState
  selection: NodeSelection
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
        y={topPos + 20}
        style={{ fill: block.textColor }}
        xmlSpace="preserve"
      >
        &quot;{node.getProperty(propertyName)}&quot;
      </text>
    )
  }
}
