import React from 'react'
import { NodeBlock } from '../../layout/rendered_node';

import "./editor.css";
import { NodeSelection } from '../../context/selection';
import { observer } from 'mobx-react';
import { ExpandedListBlockView } from './list_block';
import { InsertBox } from './insert_box';
import { JAVASCRIPT_FILE } from '../../language/types/javascript_file';
import { HTML_DOCUMENT } from '../../language/types/html_document';
import { ActiveCursor } from './cursor';
import { Panel } from '../panel';


interface EditorProps {
  block: NodeBlock;
  width: number;
  selection: NodeSelection;
}

@observer
export class Editor extends React.Component<EditorProps> {
  render() {
    let {block, selection} = this.props;
    let fileBody = null;
    if (block.node.type === JAVASCRIPT_FILE || block.node.type === HTML_DOCUMENT) {
      fileBody = block.renderedChildSets['body'];
    }
    let height = block.rowHeight + block.indentedBlockHeight;
    let insertBox = null;
    if (selection.isCursor() && selection.insertBox !== null) {
      // Whelp, this is ugly, but hey it works. :shrug:
      // This forces the insertbox to be regenerated and refocused when the insert changes position.
      let insertKey = selection.cursor.index + selection.cursor.listBlock.parentRef.childSetId + selection.cursor.listBlock.parentRef.node.node.type;
      insertBox = <InsertBox key={insertKey} editorX={1} editorY={45} selection={selection} insertBoxData={selection.insertBox} />
    }
    return <div className="editor">
      <Panel selection={selection}/>
      <svg className="editor-svg" xmlns="http://www.w3.org/2000/svg" height={height} preserveAspectRatio="none">
        <ExpandedListBlockView
            block={fileBody}
            selection={this.props.selection}
            isSelected={false} />
        <ActiveCursor selection={selection}/>
      </svg>
      { insertBox }
    </div>;
  }

  keyHandler = (event: KeyboardEvent) => {
    if (event.isComposing) {
      // IME composition
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.props.selection.deleteSelectedNode();
    }
    if (event.key === 'Tab') {
      this.props.selection.moveCursorToNextInsert();
      event.preventDefault();
      event.cancelBubble = true;
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.keyHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyHandler);
  }
}