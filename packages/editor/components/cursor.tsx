import './cursor.css'

import React from 'react'
import { observer } from 'mobx-react'

import { NODE_BLOCK_HEIGHT } from '../layout/layout_constants'
import { NodeSelection, SelectionState } from '../context/selection'

interface ActiveCursorProps {
  selection: NodeSelection
}

@observer
export class ActiveCursor extends React.Component<ActiveCursorProps> {
  render() {
    const selection = this.props.selection
    if (selection.state !== SelectionState.Cursor && selection.state !== SelectionState.MultiNode) {
      return null
    }

    const [x, y] = selection.getCursorXYPosition()
    return <line className="active-inline-cursor" x1={x} y1={y} x2={x} y2={y + NODE_BLOCK_HEIGHT} />
  }
}
