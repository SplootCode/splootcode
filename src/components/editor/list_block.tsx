import "./list_block.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, NodeSelectionState } from "../../context/selection"
import { RenderedChildSetBlock } from "../../layout/rendered_childset_block"
import { NodeBlock } from "../../layout/rendered_node"
import { EditorNodeBlock } from "./node_block"

interface ExpandedListBlockViewProps {
  block: RenderedChildSetBlock;
  isSelected: boolean;
  selection: NodeSelection;
}


interface InlineListBlockViewProps {
  block: RenderedChildSetBlock;
  isSelected: boolean;
  selection: NodeSelection;
  isInsideBreadcrumbs?: boolean;
}


@observer
export class InlineListBlockView extends React.Component<InlineListBlockViewProps> {
  render() {
    let {selection, isInsideBreadcrumbs} = this.props;
    let block = this.props.block;
    let allowInsert = block.allowInsert();
    return <React.Fragment>
      {
        block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
          let selectionState = block.getChildSelectionState(idx);
          return (
            <React.Fragment>
              <EditorNodeBlock
                  block={nodeBlock}
                  selection={this.props.selection}
                  selectionState={selectionState}
                  onClickHandler={this.onClickByIndex(idx)}
                  isInsideBreadcrumbs={isInsideBreadcrumbs} />
            </React.Fragment>
          );
        })
      }
    </React.Fragment>
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

@observer
export class ExpandedListBlockView extends React.Component<ExpandedListBlockViewProps> {
  render() {
    let {isSelected, selection} = this.props;
    let className = isSelected ? 'selected' : '';

    let block = this.props.block;
    let topPos = block.y;

    return <React.Fragment>
      {
        block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
          let selectionState = block.getChildSelectionState(idx);
          let insertBefore = block.isInsert(idx);
          let result = (
            <React.Fragment>
              <EditorNodeBlock
                  block={nodeBlock}
                  selection={this.props.selection}
                  selectionState={selectionState}
                  onClickHandler={this.onClickByIndex(idx)}
              />
            </React.Fragment>
          );
          topPos += nodeBlock.rowHeight + nodeBlock.indentedBlockHeight;
          return result;
        })
      }
    </React.Fragment>;
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
