import './property.css'

import React from 'react'

import { NODE_TEXT_OFFSET } from '../layout/layout_constants'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'

interface PropertyProps {
  block: NodeBlock
  leftPos: number
  topPos: number
  propertyName: string
  selectState: NodeSelectionState
}

export class InlineProperty extends React.Component<PropertyProps> {
  render() {
    const { block, leftPos, topPos, propertyName } = this.props
    const { node } = this.props.block

    console.log('block', block)
    console.log('node', node)
    console.log('propertyName', propertyName)

    return (
      <text x={leftPos} y={topPos + NODE_TEXT_OFFSET} style={{ fill: block.textColor }}>
        {node.getProperty(propertyName)}
      </text>
    )
  }
}
