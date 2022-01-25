import './cursor.css'

import React from 'react'
import { observer } from 'mobx-react'

import { LayoutComponentType } from '@splootcode/core/language/type_registry'
import { NodeSelection, SelectionState } from '../context/selection'

interface ActiveCursorProps {
  selection: NodeSelection
}

class TreeDotActiveCursor extends React.Component<ActiveCursorProps> {
  render() {
    const selection = this.props.selection
    if (selection.state !== SelectionState.Cursor) {
      return null
    }

    const listBlock = selection.cursor.listBlock

    if (selection.cursor.index === 0) {
      const [x, y] = [listBlock.x, listBlock.y]
      const topPos = y
      return (
        <>
          <circle className="active-inline-cursor" cx={x + 4} cy={topPos + 16} r="4"></circle>
          <line className="active-inline-cursor" x1={x + 23} x2={x + 29} y1={topPos + 10} y2={topPos + 10}></line>
          <line className="active-inline-cursor" x1={x + 26} x2={x + 26} y1={topPos + 7} y2={topPos + 13}></line>
          <line className="active-inline-cursor" x1={x + 4} x2={x + 26} y1={topPos + 16} y2={topPos + 16}></line>
        </>
      )
    }
    const [x, y] = listBlock.getInsertCoordinates(selection.cursor.index)
    const topPos = y - 6
    return (
      <>
        <line className="active-inline-cursor" x1={x - 10} x2={x - 10} y1={topPos - 14} y2={topPos + 3}></line>
        <line className="active-inline-cursor" x1={x - 11} x2={x + 70} y1={topPos + 3} y2={topPos + 3}></line>
      </>
    )
  }
}

@observer
export class ActiveCursor extends React.Component<ActiveCursorProps> {
  render() {
    const selection = this.props.selection
    if (selection.state !== SelectionState.Cursor) {
      return null
    }
    const listBlock = selection.cursor.listBlock
    const [x, y] = listBlock.getInsertCoordinates(selection.cursor.index, true)

    switch (listBlock.componentType) {
      case LayoutComponentType.CHILD_SET_TOKEN_LIST:
      case LayoutComponentType.CHILD_SET_ATTACH_RIGHT:
        return <line className="active-inline-cursor" x1={x - 2} y1={y + 2} x2={x - 2} y2={y + 28} />
      case LayoutComponentType.CHILD_SET_INLINE:
        return <line className="active-inline-cursor" x1={x + 2} y1={y + 2} x2={x + 2} y2={y + 28} />
      case LayoutComponentType.CHILD_SET_TREE_BRACKETS:
        return <TreeDotActiveCursor selection={selection} />
      case LayoutComponentType.CHILD_SET_TREE:
        return <line className="active-inline-cursor" x1={x - 2} y1={y + 2} x2={x - 2} y2={y + 28} />
      case LayoutComponentType.CHILD_SET_BLOCK:
        return <line className="active-inline-cursor" x1={x - 2} y1={y + 2} x2={x - 2} y2={y + 28} />
      // return <line className="active-inline-cursor" x1={x + 2} y1={y - 3} x2={x + 200} y2={y - 3}/>;
    }
    return <line className="active-inline-cursor" x1={x} y1={y} x2={x} y2={y + 28} />
  }
}
