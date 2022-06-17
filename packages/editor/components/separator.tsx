import React from 'react'
import { NODE_BLOCK_HEIGHT, NODE_TEXT_OFFSET } from '../layout/layout_constants'

interface StringLiteralProps {
  x: number
  y: number
  selectorType: string
  isSelected: boolean
}

export class Separator extends React.Component<StringLiteralProps> {
  render() {
    const { x, y, selectorType, isSelected } = this.props
    const className = 'separator' + (isSelected ? ' selected' : '')
    const nodeClassname = 'svgsplootnode' + (isSelected ? ' selected' : '')
    return (
      <g>
        <rect className={nodeClassname} x={x} y={y} height={NODE_BLOCK_HEIGHT} width={8} rx="4" />
        <text x={x + 1.2} y={y + NODE_TEXT_OFFSET} className={className}>
          {selectorType}
        </text>
      </g>
    )
  }
}
