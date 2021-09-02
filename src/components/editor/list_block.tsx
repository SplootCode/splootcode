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
                  isInsideBreadcrumbs={isInsideBreadcrumbs} />
            </React.Fragment>
          );
        })
      }
    </React.Fragment>
  }
}

interface RuntimeAnnotationProps {
  nodeBlock: NodeBlock
}

@observer
export class RuntimeAnnotation extends React.Component<RuntimeAnnotationProps> {
  render() {
    const block = this.props.nodeBlock;
    const annotations = block.runtimeAnnotation;
    if (annotations.length != 0) {
      const x = block.x + block.rowWidth + 12;
      let y = block.y + 20 - (annotations.length - 1) * 8;
      return (
        <g>
          {
            annotations.map(annotation => {
              const entry = <text x={x} y={y} className="annotation">{annotation}</text>
              y += 16;
              return entry;
            })
          }
        </g>
      )
    }
    return null;
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
