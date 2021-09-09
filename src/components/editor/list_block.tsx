import "./list_block.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, NodeSelectionState } from "../../context/selection"
import { RenderedChildSetBlock } from "../../layout/rendered_childset_block"
import { NodeBlock } from "../../layout/rendered_node"
import { EditorNodeBlock } from "./node_block"
import { RuntimeAnnotation } from "./runtime_annotations"

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
    let allowInsert = block.allowInsertCursor();
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
                  isInsideBreadcrumbs={isInsideBreadcrumbs} />
            </React.Fragment>
          );
        })
      }
    </React.Fragment>
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
              />
              <RuntimeAnnotation nodeBlock={nodeBlock}/>
            </React.Fragment>
          );
          topPos += nodeBlock.rowHeight + nodeBlock.indentedBlockHeight;
          return result;
        })
      }
    </React.Fragment>;
  }
}
