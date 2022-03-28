import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface AttachedChildViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    const { isSelected, block } = this.props
    const topPos = block.y

    const bracketLeftPos = block.x + 16
    const childWidth = block.width - 16 - 6

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')

    return (
      <React.Fragment>
        {/* <rect x={block.x} y={block.y} width={block.width} height={block.height} fill="white" />
        <rect x={bracketLeftPos} y={block.y} width={childWidth} height={block.height} fill="cyan" /> */}
        <line className={connectorClass} x1={block.x + 1} y1={topPos + 16} x2={bracketLeftPos - 3} y2={topPos + 16} />
        {/* {label} */}
        <path
          className={connectorClass}
          d={'M ' + bracketLeftPos + ' ' + topPos + ' a 40 40 45 0 0 0 30'}
          fill="transparent"
        ></path>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} />
            </React.Fragment>
          )
        })}
        <path
          className={connectorClass}
          d={'M ' + (bracketLeftPos + childWidth) + ' ' + topPos + ' a 40 40 45 0 1 0 30'}
          fill="transparent"
        ></path>
      </React.Fragment>
    )
  }
}
