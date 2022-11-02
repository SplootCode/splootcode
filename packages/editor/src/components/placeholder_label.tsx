import './placeholder_label.css'

import React from 'react'

import { EXPRESSION_TOKEN_SPACING, NODE_TEXT_OFFSET } from '../layout/layout_constants'

export function PlaceholderLabel(props: { x: number; y: number; label: string }) {
  const { x, y, label } = props
  return (
    <text className={'placeholder-label'} x={x + EXPRESSION_TOKEN_SPACING} y={y + NODE_TEXT_OFFSET}>
      {label}
    </text>
  )
}
