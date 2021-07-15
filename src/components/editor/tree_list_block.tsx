import "./tree_list_block.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, NodeSelectionState } from "../../context/selection"
import { RenderedChildSetBlock } from "../../layout/rendered_childset_block"
import { NodeBlock } from "../../layout/rendered_node"
import { EditorNodeBlock } from "./node_block"

interface TreeListBlockViewProps {
    block: RenderedChildSetBlock;
    isSelected: boolean;
    selection: NodeSelection;
}

@observer
export class TreeListBlockView extends React.Component<TreeListBlockViewProps> {
  render() {
    let {isSelected, block, selection} = this.props;
    let isLastInlineComponent = block.isLastInlineComponent;
    let leftPos = block.x;
    let topPos = block.y;

    let connectorClass = "tree-connector " + (isSelected ? "selected" : "");
    let labelClass = "tree-label " + (isSelected ? "selected" : "");
    let anchorClass = "svg-anchor-dot " + (isSelected ? "selected" : "");
    let labels = block.childSetTreeLabels;
    return (
      <React.Fragment>
        <circle cx={leftPos + 8} cy={topPos + 16} r="6" className={anchorClass}></circle>
        {
          block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
            let selectionState = block.getChildSelectionState(idx);
            let insertBefore = block.isInsert(idx);
            let line = null;
            let label = null;
            if (labels.length > idx) {
              label = <text className={labelClass} x={leftPos + 34} y={nodeBlock.y + 12}>{labels[idx]}</text>
            }
            if (idx === 0) {
              line = <line className={connectorClass} x1={leftPos + 8} y1={topPos + 16} x2={nodeBlock.x} y2={topPos + 16} />
            } else {
              line = <path className={connectorClass} d={"M " + (leftPos + 30) + " " + (topPos + 16) + " L " + (leftPos + 30) + " " + (nodeBlock.y + 16) + " H " + (nodeBlock.x)} fill="transparent"/>
            }
            let result = <React.Fragment>
              { line }
              { label }
              <EditorNodeBlock
                  block={nodeBlock}
                  selection={this.props.selection}
                  selectionState={selectionState}
                  onClickHandler={this.onClickByIndex(idx)}
              />
            </React.Fragment>
            // topPos += nodeBlock.rowHeight;
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


@observer
export class TreeListBlockBracketsView extends React.Component<TreeListBlockViewProps> {
  render() {
    let {isSelected, block, selection} = this.props;
    let isLastInlineComponent = block.isLastInlineComponent;
    let className = isSelected ? 'selected' : '';
    let leftPos = block.x;
    let topPos = block.y;

    let nodeCount = block.nodes.length;
    let allowInsert = block.allowInsert();
    let connectorClass = "tree-connector " + (isSelected ? "selected" : "");
    let labelClass = "tree-label " + (isSelected ? "selected" : "");
    let anchorClass = "svg-anchor-dot " + (isSelected ? "selected" : "");
    let labels = block.childSetTreeLabels;
    return (
      <React.Fragment>
        <circle cx={leftPos + 8} cy={topPos + 16} r="6" className={anchorClass}></circle>
        {
          isLastInlineComponent ?
            block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
              let selectionState = block.getChildSelectionState(idx);
              let insertBefore = block.isInsert(idx);
              let line = null;
              let label = null;
              if (labels.length > idx) {
                label = <text className={labelClass} x={leftPos + 34} y={nodeBlock.y + 12}>{labels[idx]}</text>
              }
              if (idx === 0) {
                line = <line className={connectorClass} x1={leftPos + 8} y1={topPos + 16} x2={nodeBlock.x - 8} y2={topPos + 16} />
              } else {
                line = <path className={connectorClass} d={"M " + (leftPos + 30) + " " + (topPos + 16) + " L " + (leftPos + 30) + " " + (nodeBlock.y + 16) + " H " + (nodeBlock.x - 8)} fill="transparent"/>
              }
              let result = <React.Fragment>
                { line }
                { label }
                <path className={connectorClass} d={"M " + (nodeBlock.x - 6) + " " + nodeBlock.y + " a 40 40 45 0 0 0 30" } fill="transparent"></path>
                <EditorNodeBlock
                    block={nodeBlock}
                    selection={this.props.selection}
                    selectionState={selectionState}
                    onClickHandler={this.onClickByIndex(idx)}
                />
                <path className={connectorClass} d={"M " + (nodeBlock.x + nodeBlock.rowWidth + 2) + " " + nodeBlock.y + " a 40 40 45 0 1 0 30" } fill="transparent"></path>
              </React.Fragment>
              // topPos += nodeBlock.rowHeight;
              return result;
            })
          :
            block.nodes.map((nodeBlock : NodeBlock, idx: number) => {
              let selectionState = block.getChildSelectionState(idx);
              let insertBefore = block.isInsert(idx);
              let line = null;
              topPos += nodeBlock.rowHeight;
              line = <path className={connectorClass} d={"M " + (leftPos + 8) + " " + (topPos - 18) + " v 34 h 9"} fill="transparent"/>
              let result = <React.Fragment>
                { line }
                <EditorNodeBlock
                    block={nodeBlock}
                    selection={this.props.selection}
                    selectionState={selectionState}
                    onClickHandler={this.onClickByIndex(idx)}
                />
              </React.Fragment>
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
