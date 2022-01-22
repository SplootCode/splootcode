import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface TreeListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  selection: NodeSelection
}

@observer
export class TreeListBlockView extends React.Component<TreeListBlockViewProps> {
  render() {
    const { isSelected, block } = this.props
    const leftPos = block.x
    const topPos = block.y

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')
    const labelClass = 'tree-label ' + (isSelected ? 'selected' : '')
    const anchorClass = 'svg-anchor-dot ' + (isSelected ? 'selected' : '')
    const labels = block.childSetTreeLabels
    return (
      <React.Fragment>
        <circle cx={leftPos + 4} cy={topPos + 16} r="5" className={anchorClass}></circle>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
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
              <EditorNodeBlock block={nodeBlock} selection={this.props.selection} selectionState={selectionState} />
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
    const { isSelected, block } = this.props
    const leftPos = block.x
    const topPos = block.y

    const connectorClass = 'tree-connector ' + (isSelected ? 'selected' : '')
    const labelClass = 'tree-label ' + (isSelected ? 'selected' : '')
    const anchorClass = 'svg-anchor-dot ' + (isSelected ? 'selected' : '')
    const labels = block.childSetTreeLabels
    return (
      <React.Fragment>
        <circle cx={leftPos + 4} cy={topPos + 16} r="5" className={anchorClass}></circle>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          let line = null
          let label = null
          if (labels.length > idx) {
            label = (
              <text className={labelClass} x={leftPos + 20} y={nodeBlock.y + 12}>
                {labels[idx]}
              </text>
            )
          }
          if (idx === 0) {
            line = (
              <line
                className={connectorClass}
                x1={leftPos + 8}
                y1={topPos + 16}
                x2={nodeBlock.x - 8}
                y2={topPos + 16}
              />
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
                  (nodeBlock.x - 8)
                }
                fill="transparent"
              />
            )
          }
          return (
            <React.Fragment key={idx}>
              {line}
              {label}
              <path
                className={connectorClass}
                d={'M ' + (nodeBlock.x - 6) + ' ' + nodeBlock.y + ' a 40 40 45 0 0 0 30'}
                fill="transparent"
              ></path>
              <EditorNodeBlock block={nodeBlock} selection={this.props.selection} selectionState={selectionState} />
              <path
                className={connectorClass}
                d={'M ' + (nodeBlock.x + nodeBlock.rowWidth + 2) + ' ' + nodeBlock.y + ' a 40 40 45 0 1 0 30'}
                fill="transparent"
              ></path>
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
