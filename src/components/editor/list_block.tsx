import React from 'react'
import { NodeBlock } from '../../layout/rendered_node';
import { EditorNodeBlock } from './node_block';
import { NodeSelection, NodeSelectionState } from '../../context/selection';
import { observer } from 'mobx-react';
import { RenderedChildSetBlock } from '../../layout/rendered_childset_block';
import { InlineCursor, NewLineCursor } from './cursor';

import "./list_block.css";


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
              { allowInsert ? <InlineCursor index={idx} listBlock={block} leftPos={block.x} topPos={block.y} selection={selection}/> : null}
            </React.Fragment>
          );
        })
      }
      { allowInsert ? <InlineCursor index={block.nodes.length} listBlock={block} leftPos={block.x + block.width + 5} topPos={block.y} selection={selection}/> : null }
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
                  onClickHandler={this.onClickByIndex(idx)} />
              <NewLineCursor index={idx} listBlock={block} leftPos={nodeBlock.x} topPos={nodeBlock.y} selection={selection}/>
            </React.Fragment>
          );
          topPos += nodeBlock.rowHeight + nodeBlock.indentedBlockHeight;
          return result;
        })
      }
      <NewLineCursor index={block.nodes.length} listBlock={block} leftPos={block.x} topPos={block.y + block.height - 12} selection={selection}/>
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

interface InsertCursorProps {
  listBlock: RenderedChildSetBlock;
  index: number;
  selection: NodeSelection;
}

class InsertCursor extends React.Component<InsertCursorProps> {
  render() {
    return <span onClick={this.onClick}>{ this.props.children }</span>
  }

  onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    let { selection, listBlock, index} = this.props;
    selection.startInsertNode(listBlock, index);
  }
}