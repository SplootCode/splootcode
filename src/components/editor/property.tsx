import React from 'react'

import { NodeSelection, NodeCursor, NodeSelectionState } from '../../context/selection';
import { NodeBlock } from '../../layout/rendered_node';
import { observer } from 'mobx-react';

import "./property.css";

interface PropertyEditState {
  userInput: string;
  autoWidth: number;
}

interface PropertyProps {
  block: NodeBlock;
  leftPos: number;
  topPos: number;
  propertyName: string;
  selectState: NodeSelectionState;
  selection: NodeSelection;
}

@observer
class PropertyEditor extends React.Component<PropertyProps, PropertyEditState> {
  constructor(props: PropertyProps) {
    super(props);
    let { propertyName } = this.props;
    let { node } = this.props.block;

    let startValue = node.getProperty(propertyName).toString();
    this.state = {
      userInput: node.getProperty(propertyName),
      autoWidth: this.getWidth(startValue),
    };
  }

  render() {
    let { propertyName, selectState } = this.props;
    let { node } = this.props.block;
    let { userInput, autoWidth } = this.state;
    let edit = selectState === NodeSelectionState.EDITING;

    return (
      <input
          autoFocus
          type="text"
          defaultValue={userInput}
          onChange={this.onChange}
          onClick={this.onClick}
          onKeyDown={this.onKeyDown}
          onBlur={this.onBlur}
          style={{"width": autoWidth}}
          />
    );
  }

  onKeyDown = (e : React.KeyboardEvent<HTMLInputElement>) => {
    // Escape and enter keys
    if (e.keyCode === 27 || e.keyCode === 13) {
      // Clear edit state
      this.props.selection.exitEdit();
      e.stopPropagation();
    }
  }

  onBlur = (e : React.FocusEvent<HTMLInputElement>) => {
    this.props.selection.exitEdit();
  }

  getWidth = (input: string) => {
    // Horrible hack :)
    return input.length * 8 + 10;
  }

  onClick = (e : React.MouseEvent<HTMLInputElement>) => {
    // e.stopPropagation();
  }

  onChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    let { block, propertyName } = this.props;
    block.node.setProperty(propertyName, e.currentTarget.value);
    this.setState({
        userInput: e.currentTarget.value,
        autoWidth: this.getWidth(e.currentTarget.value)
    });
  }
}

export class InlineProperty extends React.Component<PropertyProps> {
  render() {
    let { block, leftPos, topPos, propertyName, selectState, selection } = this.props;
    let { node } = this.props.block;
    let isEditing = selectState === NodeSelectionState.EDITING;
    let isSelected = isEditing || selectState === NodeSelectionState.SELECTED
    let className = isEditing ? 'editing' : '';
    /*
    if (isEditing) {
      return (
        <text className={"inline-component-property " + className}>
        <PropertyEditor block={block} propertyName={propertyName} selectState={selectState} selection={selection}/>
        </text>
      );
    }
    */
    return <text x={leftPos} y={topPos + 20} style={{'fill': block.textColor}}>{ node.getProperty(propertyName) }</text>;
  }
}
