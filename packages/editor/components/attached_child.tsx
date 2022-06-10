import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { BRACKET_WIDTH } from '../layout/layout_constants'
import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface AttachedChildViewProps {
  childSetBlock: RenderedChildSetBlock
  isSelected: boolean
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    const { isSelected, childSetBlock } = this.props

    const bracketLeftPos = childSetBlock.x + BRACKET_WIDTH
    const childWidth = childSetBlock.width - BRACKET_WIDTH

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')

    const leftBracket = (
      <path
        className={connectorClass}
        d={`M ${bracketLeftPos} ${childSetBlock.y} v 0.4 a 20 20 0 0 0 0 20 v 0.4`}
        fill="transparent"
      ></path>
    )
    const rightBracket = (
      <path
        className={connectorClass}
        d={`M ${bracketLeftPos + childWidth} ${childSetBlock.y} v 0.4 a 20 20 0 0 1 0 20 v 0.4`}
        fill="transparent"
      ></path>
    )

    return (
      <React.Fragment>
        {leftBracket}
        {childSetBlock.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = childSetBlock.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} />
            </React.Fragment>
          )
        })}
        {rightBracket}
      </React.Fragment>
    )
  }
}
