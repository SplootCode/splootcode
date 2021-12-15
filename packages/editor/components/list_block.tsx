import './list_block.css'

import { observer } from 'mobx-react'
import React from 'react'

import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { NodeBlock } from '../layout/rendered_node'
import { EditorNodeBlock } from './node_block'
import { RuntimeAnnotation } from './runtime_annotations'

interface ExpandedListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  selection: NodeSelection
}

interface InlineListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  selection: NodeSelection
  isInsideBreadcrumbs?: boolean
}

@observer
export class InlineListBlockView extends React.Component<InlineListBlockViewProps> {
  render() {
    const { isInsideBreadcrumbs } = this.props
    const block = this.props.block
    return (
      <React.Fragment>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock
                block={nodeBlock}
                selection={this.props.selection}
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
              <EditorNodeBlock block={nodeBlock} selection={this.props.selection} selectionState={selectionState} />
              <RuntimeAnnotation nodeBlock={nodeBlock} />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
