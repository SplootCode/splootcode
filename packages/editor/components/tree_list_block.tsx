import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { BRACKET_WIDTH, NODE_BLOCK_HEIGHT } from '../layout/layout_constants'
import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface TreeListBlockViewProps {
  childSetBlock: RenderedChildSetBlock
  isSelected: boolean
}

@observer
export class TreeListBlockView extends React.Component<TreeListBlockViewProps> {
  render() {
    const { isSelected, childSetBlock } = this.props
    const leftPos = childSetBlock.x
    const topPos = childSetBlock.y

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')
    const labelClass = 'tree-label ' + (isSelected ? 'selected' : '')
    const anchorClass = 'svg-anchor-dot ' + (isSelected ? 'selected' : '')
    const labels = childSetBlock.childSetTreeLabels
    return (
      <React.Fragment>
        <circle cx={leftPos + 4} cy={topPos + 16} r="5" className={anchorClass}></circle>
        {childSetBlock.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = childSetBlock.getChildSelectionState(idx)
          let line = null
          let label = null
          if (labels.length > idx) {
            label = (
              <text className={labelClass} x={leftPos + 34} y={nodeBlock.y + 12}>
                {labels[idx]}
              </text>
            )
          }
          if (idx === 0) {
            line = (
              <line className={connectorClass} x1={leftPos + 8} y1={topPos + 16} x2={nodeBlock.x} y2={topPos + 16} />
            )
          } else {
            line = (
              <path
                className={connectorClass}
                d={
                  'M ' +
                  (leftPos + 16) +
                  ' ' +
                  (topPos + 16) +
                  ' L ' +
                  (leftPos + 16) +
                  ' ' +
                  (nodeBlock.y + 16) +
                  ' H ' +
                  nodeBlock.x
                }
                fill="transparent"
              />
            )
          }
          return (
            <React.Fragment key={idx}>
              {line}
              {label}
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}

@observer
export class TreeListBlockBracketsView extends React.Component<TreeListBlockViewProps> {
  render() {
    const { isSelected, childSetBlock } = this.props
    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')
    if (childSetBlock.nodes.length === 0) {
      return (
        <>
          <path
            className={connectorClass}
            d={`M ${childSetBlock.x + BRACKET_WIDTH} ${childSetBlock.y} v 0.4 a 20 20 0 0 0 0 20 v 0.4`}
            fill="transparent"
          ></path>
          <path
            className={connectorClass}
            d={`M ${childSetBlock.x + childSetBlock.width - BRACKET_WIDTH} ${
              childSetBlock.y
            } v 0.4 a 20 20 0 0 1 0 20 v 0.4`}
            fill="transparent"
          ></path>
        </>
      )
    }
    const width = childSetBlock.width - 2 * BRACKET_WIDTH

    let prevRowBottom = 0

    return (
      <React.Fragment>
        {childSetBlock.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = childSetBlock.getChildSelectionState(idx)
          let leftBracket = null
          let rightBracket = null
          if (idx === 0) {
            leftBracket = (
              <path
                className={connectorClass}
                d={`M ${nodeBlock.x} ${nodeBlock.y} v 0.4 a 20 20 0 0 0 0 20 v 0.4`}
                fill="transparent"
              ></path>
            )
            rightBracket = (
              <path
                className={connectorClass}
                d={`M ${nodeBlock.x + width} ${nodeBlock.y} v 0.4 a 20 20 0 0 1 0 20 v 0.4`}
                fill="transparent"
              ></path>
            )
          } else {
            leftBracket = (
              <path
                className={connectorClass}
                d={`M ${nodeBlock.x} ${prevRowBottom} V ${nodeBlock.y} a 20 20 0 0 0 0 20 v 0.4`}
                fill="transparent"
              ></path>
            )
            rightBracket = (
              <path
                className={connectorClass}
                d={`M ${nodeBlock.x + width} ${prevRowBottom} V ${nodeBlock.y} a 20 20 0 0 1 0 20 v 0.4`}
                fill="transparent"
              ></path>
            )
          }
          prevRowBottom = nodeBlock.y + NODE_BLOCK_HEIGHT

          return (
            <React.Fragment key={idx}>
              {leftBracket}
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} />
              {rightBracket}
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
