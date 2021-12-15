import React from 'react'

import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection, NodeSelectionState } from '../context/selection'
import { TokenListBlockView } from './token_list_block'

interface NodeBlockProps {
  block: NodeBlock
  selection: NodeSelection
  selectionState: NodeSelectionState
}

export class SplootExpressionView extends React.Component<NodeBlockProps> {
  render() {
    const { block, selectionState } = this.props
    const isSelected = selectionState === NodeSelectionState.SELECTED

    const tokenBlock = block.renderedChildSets['tokens']

    return (
      <React.Fragment>
        <TokenListBlockView key={0} block={tokenBlock} isSelected={isSelected} selection={this.props.selection} />
      </React.Fragment>
    )
  }
}
