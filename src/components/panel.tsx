import React from 'react'
import { MenuButton } from './menu_button';
import { EditorState, EditorStateContext } from '../context/editor_context';
import { NodeSelection } from '../context/selection';
import { observer } from 'mobx-react';

import './panel.css';


interface PanelProps {
  selection: NodeSelection;
}

@observer
export class Panel extends React.Component<PanelProps, any, EditorState> {

  render() {
    let {selection} = this.props;

    return (
      <div className="panel">
        <MenuButton
            disabled={!selection.isCursor()}
            onClick={() => {
              selection.startInsertAtCurrentCursor();
            }}>Insert</MenuButton> 
        <MenuButton
            disabled={false}
            onClick={() => {}}>Edit</MenuButton>
        <MenuButton
            disabled={!selection.isSingleNode()}
            onClick={() => {
              selection.deleteSelectedNode();
            }}>Delete</MenuButton>
      </div>
    )
  }
}
