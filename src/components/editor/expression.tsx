import React, { ReactElement } from 'react'
import { NodeSelection, NodeSelectionState } from '../../context/selection';
import { SPLOOT_EXPRESSION } from '../../language/types/expression';
import { NodeBlock } from '../../layout/rendered_node';
import { TokenListBlockView } from './token_list_block';


interface NodeBlockProps {
  block: NodeBlock;
  selection: NodeSelection;
  selectionState: NodeSelectionState;
}

export class SplootExpressionView extends React.Component<NodeBlockProps> {
  render() {
    let { block, selection, selectionState } = this.props;
    let isSelected = selectionState === NodeSelectionState.SELECTED;
    let width = block.blockWidth;

    let tokenBlock = block.renderedChildSets['tokens'];

    return (
      <React.Fragment>
        <TokenListBlockView key={0} block={tokenBlock} isSelected={isSelected} selection={this.props.selection} />
      </React.Fragment>
    )
  }
}