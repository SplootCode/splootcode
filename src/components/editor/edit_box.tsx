import "./edit_box.css"

import { observer } from "mobx-react"
import React from "react"

import {
  NodeSelection,
  SelectionState,
} from "../../context/selection"
import { EditBoxData } from "../../context/edit_box"
import { stringWidth } from "../../layout/rendered_childset_block"


interface EditBoxState {
  userInput: string;
  autoWidth: number;
}

interface EditBoxProps {
  editorX: number;
  editorY: number;
  editBoxData: EditBoxData;
  selection: NodeSelection;
}

@observer
export class EditBox extends React.Component<EditBoxProps, EditBoxState> {

  constructor(props: EditBoxProps) {
    super(props);
    const editBoxData = this.props.editBoxData;
    const contents = editBoxData.contents.toString();

    this.state = {
      userInput: editBoxData.contents, // Get current edit value
      autoWidth: this.getWidth(editBoxData.contents),
    };
  }

  render() {
    let { userInput, autoWidth } = this.state;
    let {editorX, editorY, editBoxData} = this.props;
    let {x, y} = editBoxData;
    let positionStyles : React.CSSProperties;
    let adjustX = 15;
    let adjustY = 4;
    positionStyles = {
      position: 'absolute',
      left: (x + editorX - 2 + adjustX) + 'px',
      top: (y + editorY + 1 + adjustY) + 'px',
    }

    return (
      <div style={positionStyles}>
        <div className={"edit-box"}>
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
        </div>
      </div>
    );
  }

  onKeyDown = (e : React.KeyboardEvent<HTMLInputElement>) => {
    let { selection } = this.props;
    const { userInput } = this.state;

    // Escape
    if (e.keyCode === 27) {
      selection.exitEdit();
    }

    // Enter key
    if (e.keyCode === 13) {
      selection.exitEdit();
    }
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();  
  }

  onBlur = (e : React.FocusEvent<HTMLInputElement>) => {
    let selection = this.props.selection;
    // selection.exitEdit();
  }

  getWidth = (input: string) => {
    return stringWidth(input) + 5;    
  }

  onClick = (e : React.MouseEvent<HTMLInputElement>) => {
    // e.stopPropagation();
  }

  onChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.currentTarget.value;
    this.setState({
      userInput: userInput,
      autoWidth: this.getWidth(userInput),
    });
    this.props.selection.updatePropertyEdit(userInput);
  }
}