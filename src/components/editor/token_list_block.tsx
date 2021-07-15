import "./tree_list_block.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, NodeSelectionState } from "../../context/selection"
import { RenderedChildSetBlock } from "../../layout/rendered_childset_block"
import { NodeBlock } from "../../layout/rendered_node"
import { EditorNodeBlock } from "./node_block"

interface TokenListBlockViewProps {
    block: RenderedChildSetBlock;
    isSelected: boolean;
    selection: NodeSelection;
  }
  
@observer
export class TokenListBlockView extends React.Component<TokenListBlockViewProps> {
  render() {
    let {isSelected, block, selection} = this.props;
    let isLastInlineComponent = block.isLastInlineComponent;
    let className = isSelected ? 'selected' : '';

    let nodeCount = block.nodes.length;
    let allowInsert = block.allowInsert();
    return (
      <React.Fragment>
        {
          block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
            let selectionState = block.getChildSelectionState(idx);
            let insertBefore = block.isInsert(idx);
            let result =  (
              <React.Fragment>
                <EditorNodeBlock
                  block={nodeBlock}
                  selection={this.props.selection}
                  selectionState={selectionState}
                  onClickHandler={this.onClickByIndex(idx)}/>
              </React.Fragment>
            );
            return result;
          })
        }
      </React.Fragment>
    );
  }

  onClickByIndex(idx: number) {
    return (event: React.MouseEvent) => {
      event.stopPropagation();
      let { block } = this.props;
      let isSelected = block.getChildSelectionState(idx) === NodeSelectionState.SELECTED;
      if (isSelected) {
        // if already selected, go into edit mode
        this.props.selection.editNodeByIndex(block, idx);
        return;
      }
      this.props.selection.selectNodeByIndex(block, idx);
    }
  }
}
