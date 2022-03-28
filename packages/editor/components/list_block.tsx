import './list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface ExpandedListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
}

interface InlineListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  isValid: boolean
  isInsideBreadcrumbs?: boolean
}

@observer
export class InlineListBlockView extends React.Component<InlineListBlockViewProps> {
  render() {
    const { isInsideBreadcrumbs, isValid } = this.props
    const block = this.props.block
    const width = Math.max(block.width, 8)
    const classname = 'svgsplootnode gap' + (isValid ? '' : ' invalid')
    return (
      <React.Fragment>
        <rect className={classname} x={block.x} y={block.y + 1} height="28" width={width} rx="4" />

        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock
                block={nodeBlock}
                selectionState={selectionState}
                isInsideBreadcrumbs={isInsideBreadcrumbs}
              />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}

@observer
export class ExpandedListBlockView extends React.Component<ExpandedListBlockViewProps> {
  render() {
    const block = this.props.block

    return (
      <React.Fragment>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
