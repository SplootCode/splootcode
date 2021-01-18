import React from 'react'

import { observer } from "mobx-react";
import { NodeSelection, NodeSelectionState } from "../../context/selection";
import { EditorNodeBlock } from './node_block';

import "./tree_list_block.css";
import { NodeAttachmentLocation } from '../../language/type_registry';
import { RenderedChildSetBlock } from '../../layout/rendered_childset_block';

interface AttachedChildViewProps {
    block: RenderedChildSetBlock;
    isSelected: boolean;
    selection: NodeSelection;
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    let {isSelected, block} = this.props;
    let leftPos = block.x;
    let topPos = block.y;
    let isLastInlineComponent = block.isLastInlineComponent;
    let className = isSelected ? 'selected' : '';

    let nodeCount = block.nodes.length;
    let allowInsert = block.allowInsert();

    // Can only be one child (or zero) for attached childsets
    let child = block.nodes.length > 0 ? block.nodes[0] : null;
    let selectionState = block.getChildSelectionState(0);
    /*
     A rx ry x-axis-rotation large-arc-flag sweep-flag x y
     a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
    */
    let childWidth = (child === null) ? 0 : child.rowWidth;
    let connectorClass = "tree-connector " + (isSelected ? "selected" : "");
    return (
      <React.Fragment>        
        <line className={connectorClass} x1={leftPos + 1} y1={topPos + 16} x2={leftPos + 6} y2={topPos + 16} />
        <path className={connectorClass} d={"M " + (leftPos + 9) + " " + topPos + " a 40 40 45 0 0 0 30" } fill="transparent"></path>
        <EditorNodeBlock block={child} selection={this.props.selection} selectionState={selectionState} onClickHandler={this.onClickByIndex(0)}/>
        <path className={connectorClass} d={"M " + (leftPos + childWidth + 18) + " " + topPos + " a 40 40 45 0 1 0 30" } fill="transparent"></path>
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

