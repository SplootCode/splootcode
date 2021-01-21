import React, { Fragment } from 'react'
import { RenderedChildSetBlock } from '../../layout/rendered_childset_block';
import { NodeSelection, SelectionState } from '../../context/selection';

import './cursor.css';
import { observer } from 'mobx-react';
import { LayoutComponentType } from '../../language/type_registry';


interface CursorProps {
  listBlock: RenderedChildSetBlock;
  index: number;
  leftPos: number;
  topPos: number;
  selection: NodeSelection;
}

export class InlineCursor extends React.Component<CursorProps> {
  render() {
    let {leftPos, topPos} = this.props;
    let x = leftPos - 2;
    return (
      <g className="inline-cursor-group" onClick={this.onClick}>
        <rect className="inline-cursor-hover" x={x - 4} width="8" y={topPos} height="30"/>
        <line className="inline-cursor" x1={x} x2={x} y1={topPos + 2} y2={topPos + 28}></line>
      </g>
    );
  }

  onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    let { selection, listBlock, index} = this.props;
    selection.placeCursor(listBlock, index);
  }
}


export class NewLineCursor extends React.Component<CursorProps> {
  render() {
    let {leftPos, topPos} = this.props;
    let x = leftPos - 2;
    return (
      <g className="inline-cursor-group" onClick={this.onClick}>
        <rect className="inline-cursor-hover" x={x - 20} width="16" y={topPos - 6} height="32"/>
        <rect className="inline-cursor-hover" x={x - 4} width="200" y={topPos - 6} height="6"/>
        <line className="inline-cursor" x1={x + 4} x2={x + 200} y1={topPos - 3} y2={topPos - 3}></line>
      </g>
    );
  }

  onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    let { selection, listBlock, index} = this.props;
    selection.placeCursor(listBlock, index);
  }
}

export class TreeDotCursor extends React.Component<CursorProps> {
  render() {
    let {leftPos, topPos} = this.props;
    let x = leftPos - 2;
    return (
      <g className="inline-cursor-group" onClick={this.onClick}>
        <rect className="inline-cursor-hover" x={x - 4} width="38" y={topPos + 4} height="20"/>
        <circle className="inline-cursor-circle" cx={x + 2} cy={topPos + 16} r="6"></circle>
        <line className="inline-cursor-lite" x1={x + 23} x2={x + 29} y1={topPos + 10} y2={topPos + 10}></line>
        <line className="inline-cursor-lite" x1={x + 26} x2={x + 26} y1={topPos + 7} y2={topPos + 13}></line>
        <line className="inline-cursor" x1={x} x2={x + 26} y1={topPos + 16} y2={topPos + 16}></line>
      </g>
    );
  }

  onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    let { selection, listBlock, index} = this.props;
    selection.placeCursor(listBlock, index);
  }
}


export class TreeDotCursorSecondary extends React.Component<CursorProps> {
  render() {
    let {leftPos, topPos} = this.props;
    let x = leftPos - 2;
    return (
      <g className="inline-cursor-group" onClick={this.onClick}>
        <rect className="inline-cursor-hover" x={x - 15} width="18" y={topPos - 10} height="20"/>
        <rect className="inline-cursor-hover" x={x - 15} width="60" y={topPos - 1} height="20"/>
        <line className="inline-cursor" x1={x - 8} x2={x - 8} y1={topPos - 14} y2={topPos + 3}></line>
        <line className="inline-cursor" x1={x - 9} x2={x + 56} y1={topPos + 3} y2={topPos + 3}></line>
      </g>
    );
  }

  onClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    let { selection, listBlock, index} = this.props;
    selection.placeCursor(listBlock, index);
  }
}

interface ActiveCursorProps {
  selection: NodeSelection;
}

class TreeDotActiveCursor extends React.Component<ActiveCursorProps> {
  render() {
    let selection = this.props.selection;
    if (selection.state !== SelectionState.Cursor) {
      return null;
    }
    
    let listBlock = selection.cursor.listBlock;
    
    if (selection.cursor.index === 0) {
      let [x, y] = [listBlock.x, listBlock.y]
      let topPos = y;
      return (
        <>
          <circle className="active-inline-cursor" cx={x + 8} cy={topPos + 16} r="5"></circle>
          <line className="active-inline-cursor" x1={x + 23} x2={x + 29} y1={topPos + 10} y2={topPos + 10}></line>
          <line className="active-inline-cursor" x1={x + 26} x2={x + 26} y1={topPos + 7} y2={topPos + 13}></line>
          <line className="active-inline-cursor" x1={x + 4} x2={x + 26} y1={topPos + 16} y2={topPos + 16}></line>
        </>
      )
    }
    let [x, y] = listBlock.getInsertCoordinates(selection.cursor.index);
    let topPos = y - 6;
    return (
      <>
        <line className="active-inline-cursor" x1={x - 10} x2={x - 10} y1={topPos - 14} y2={topPos + 3}></line>
        <line className="active-inline-cursor" x1={x - 11} x2={x + 70} y1={topPos + 3} y2={topPos + 3}></line>
      </>
    );
  }
}

@observer
export class ActiveCursor extends React.Component<ActiveCursorProps> {
  render() {
    let selection = this.props.selection;
    if (selection.state !== SelectionState.Cursor) {
      return null;
    }
    let listBlock = selection.cursor.listBlock;
    let [x, y] = listBlock.getInsertCoordinates(selection.cursor.index);

    switch (listBlock.componentType) {
      case LayoutComponentType.CHILD_SET_TOKEN_LIST:
        return <line className="active-inline-cursor" x1={x - 2} y1={y + 2} x2={x - 2} y2={y + 28}/>
      case LayoutComponentType.CHILD_SET_INLINE:
        return <line className="active-inline-cursor" x1={x + 2} y1={y + 2} x2={x + 2} y2={y + 28}/>
      case LayoutComponentType.CHILD_SET_TREE:
        return <TreeDotActiveCursor selection={selection} />
      case LayoutComponentType.CHILD_SET_BLOCK:
        return <line className="active-inline-cursor" x1={x + 2} y1={y - 3} x2={x + 200} y2={y - 3}/>;
    }
    return (
      <line className="active-inline-cursor" x1={x} y1={y} x2={x} y2={y + 28}/>
    )
  }
};