import React from 'react'

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
        <rect className={nodeClassname} x={x - 5} y={y + 4} height="23" width={8} rx="4" />
        <text x={x - 3} y={y + 19} className={className}>
          {selectorType}
        </text>
      </g>
    )
  }
}
