import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from '../context/selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface TokenListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  selection: NodeSelection
}

@observer
export class TokenListBlockView extends React.Component<TokenListBlockViewProps> {
  render() {
    const { block } = this.props
    return (
      <React.Fragment>
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selection={this.props.selection} selectionState={selectionState} />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
