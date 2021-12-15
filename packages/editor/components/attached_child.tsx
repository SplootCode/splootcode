import './tree_list_block.css'

import { observer } from 'mobx-react'
import React from 'react'

import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { EditorNodeBlock } from './node_block'

interface AttachedChildViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  selection: NodeSelection
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    const { isSelected, block } = this.props
    const topPos = block.y

    const allowInsert = block.allowInsertCursor()

    // Can only be one child (or zero) for attached childsets
    const child = block.nodes.length > 0 ? block.nodes[0] : null
    const selectionState = block.getChildSelectionState(0)
    /*
     A rx ry x-axis-rotation large-arc-flag sweep-flag x y
     a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
    */
    const childWidth = child === null ? 0 : child.rowWidth

    // TODO: This is going to break when we have a labeled childset with no contents, no child.
    const bracketLeftPos = child === null ? block.x + 4 : child.x - 16
    const labelClass = 'tree-label ' + (isSelected ? 'selected' : '')
    const label = (
      <text className={labelClass} x={block.x + 6} y={block.y + 12}>
        {block.childSetRightAttachLabel}
      </text>
    )
    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')
    if (allowInsert) {
      return (
        <React.Fragment>
          <line className={connectorClass} x1={block.x + 1} y1={topPos + 16} x2={bracketLeftPos + 6} y2={topPos + 16} />
          {label}
          <path
            className={connectorClass}
            d={'M ' + (bracketLeftPos + 9) + ' ' + topPos + ' a 40 40 45 0 0 0 30'}
            fill="transparent"
          ></path>
          <path
            className={connectorClass}
            d={'M ' + (bracketLeftPos + childWidth + 18) + ' ' + topPos + ' a 40 40 45 0 1 0 30'}
            fill="transparent"
          ></path>
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>
        <line className={connectorClass} x1={block.x + 1} y1={topPos + 16} x2={bracketLeftPos + 6} y2={topPos + 16} />
        {label}
        <path
          className={connectorClass}
          d={'M ' + (bracketLeftPos + 9) + ' ' + topPos + ' a 40 40 45 0 0 0 30'}
          fill="transparent"
        ></path>
        <EditorNodeBlock block={child} selection={this.props.selection} selectionState={selectionState} />
        <path
          className={connectorClass}
          d={'M ' + (bracketLeftPos + childWidth + 18) + ' ' + topPos + ' a 40 40 45 0 1 0 30'}
          fill="transparent"
        ></path>
      </React.Fragment>
    )
  }
}
