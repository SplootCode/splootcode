import "./tree_list_block.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, NodeSelectionState } from "../../context/selection"
import { NodeAttachmentLocation } from "../../language/type_registry"
import { RenderedChildSetBlock } from "../../layout/rendered_childset_block"
import { EditorNodeBlock } from "./node_block"

interface AttachedChildViewProps {
    block: RenderedChildSetBlock;
    isSelected: boolean;
    selection: NodeSelection;
}

@observer
export class AttachedChildRightExpressionView extends React.Component<AttachedChildViewProps> {
  render() {
    let {isSelected, block, selection} = this.props;
    let topPos = block.y;

    let allowInsert = block.allowInsert();

    // Can only be one child (or zero) for attached childsets
    let child = block.nodes.length > 0 ? block.nodes[0] : null;
    let selectionState = block.getChildSelectionState(0);
    /*
     A rx ry x-axis-rotation large-arc-flag sweep-flag x y
     a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
    */
    let childWidth = (child === null) ? 0 : child.rowWidth;

    // TODO: This is going to break when we have a labeled childset with no contents, no child.
    let bracketLeftPos = (child === null) ? block.x : child.x - 16;
    let labelClass = "tree-label " + (isSelected ? "selected" : "");
    let label = <text className={labelClass} x={block.x + 6} y={block.y + 12}>{block.childSetRightAttachLabel}</text>
    let connectorClass = "tree-connector " + (isSelected ? "selected" : "");
    if (allowInsert) {
      return (
        <React.Fragment>
          <line className={connectorClass} x1={block.x + 1} y1={topPos + 16} x2={bracketLeftPos + 6} y2={topPos + 16} />
          { label }
          <path className={connectorClass} d={"M " + (bracketLeftPos + 9) + " " + topPos + " a 40 40 45 0 0 0 30" } fill="transparent"></path>
          <path className={connectorClass} d={"M " + (bracketLeftPos + childWidth + 18) + " " + topPos + " a 40 40 45 0 1 0 30" } fill="transparent"></path>
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>        
        <line className={connectorClass} x1={block.x + 1} y1={topPos + 16} x2={bracketLeftPos + 6} y2={topPos + 16} />
        { label }
        <path className={connectorClass} d={"M " + (bracketLeftPos + 9) + " " + topPos + " a 40 40 45 0 0 0 30" } fill="transparent"></path>
        <EditorNodeBlock
            block={child}
            selection={this.props.selection}
            selectionState={selectionState}
            onClickHandler={this.onClickByIndex(0)}
        />
        <path className={connectorClass} d={"M " + (bracketLeftPos + childWidth + 18) + " " + topPos + " a 40 40 45 0 1 0 30" } fill="transparent"></path>
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

