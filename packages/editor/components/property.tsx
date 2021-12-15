import './property.css'

import React from 'react'

import { NodeSelection, NodeSelectionState } from '../context/selection'
import { NodeBlock } from '../layout/rendered_node'

interface PropertyProps {
  block: NodeBlock
  leftPos: number
  topPos: number
  propertyName: string
  selectState: NodeSelectionState
  selection: NodeSelection
}

export class InlineProperty extends React.Component<PropertyProps> {
  render() {
    const { block, leftPos, topPos, propertyName } = this.props
    const { node } = this.props.block

    return (
      <text x={leftPos} y={topPos + 20} style={{ fill: block.textColor }}>
        {node.getProperty(propertyName)}
      </text>
    )
  }
}
