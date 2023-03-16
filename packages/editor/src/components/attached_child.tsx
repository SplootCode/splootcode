import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { AttachRightLayoutHandler } from '../layout/attach_right_layout_handler'
import { BRACKET_WIDTH } from '../layout/layout_constants'
import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface AttachedChildViewProps {
  childSetBlock: RenderedChildSetBlock
  isSelected: boolean
  invalidIndex?: number
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    const { isSelected, childSetBlock, invalidIndex } = this.props

    const bracketLeftPos = childSetBlock.x + BRACKET_WIDTH
    const childWidth = childSetBlock.width - BRACKET_WIDTH * 2

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')

    const layoutHandler = childSetBlock.layoutHandler as AttachRightLayoutHandler

    let leftBracket = null
    let rightBracket = null

    if (layoutHandler.brackets) {
      leftBracket = (
        <path
          className={connectorClass}
          d={`M ${bracketLeftPos} ${childSetBlock.y} v 0.4 a 18 18 0 0 0 0 18 v 0.4`}
          fill="transparent"
        ></path>
      )
      rightBracket = (
        <path
          className={connectorClass}
          d={`M ${bracketLeftPos + childWidth} ${childSetBlock.y} v 0.4 a 18 18 0 0 1 0 18 v 0.4`}
          fill="transparent"
        ></path>
      )
    }

    const label = childSetBlock.labels.length > 0 ? childSetBlock.labels[0] : undefined
    return (
      <React.Fragment>
        {leftBracket}
        {childSetBlock.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = childSetBlock.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock
                block={nodeBlock}
                selectionState={selectionState}
                placeholder={label}
                isInvalidBlamed={invalidIndex === idx}
              />
            </React.Fragment>
          )
        })}
        {rightBracket}
      </React.Fragment>
    )
  }
}
