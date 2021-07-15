import "./editor.css"

import { observer } from "mobx-react"
import React from "react"

import { NodeSelection, SelectionState } from "../../context/selection"
import {
  adaptNodeToPasteDestination,
  deserializeNode,
} from "../../language/type_registry"
import { HTML_DOCUMENT } from "../../language/types/html/html_document"
import { JAVASCRIPT_FILE } from "../../language/types/js/javascript_file"
import { PYTHON_FILE } from "../../language/types/python/python_file"
import { NodeBlock } from "../../layout/rendered_node"
import { ActiveCursor } from "./cursor"
import { DragOverlay } from "./drag_overlay"
import { InsertBox } from "./insert_box"
import { ExpandedListBlockView } from "./list_block"
import { Tray } from "./tray"

export const SPLOOT_MIME_TYPE = 'application/splootcodenode';

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
    if (block.node.type === JAVASCRIPT_FILE || block.node.type === PYTHON_FILE || block.node.type === HTML_DOCUMENT) {
      fileBody = block.renderedChildSets['body'];
    }
    let height = block.rowHeight + block.indentedBlockHeight;
    let insertBox = null;
    if (selection.isCursor() && selection.insertBox !== null) {
      // Whelp, this is ugly, but hey it works. :shrug:
      // This forces the insertbox to be regenerated and refocused when the insert changes position.
      let insertKey = selection.cursor.index + selection.cursor.listBlock.parentRef.childSetId + selection.cursor.listBlock.parentRef.node.node.type;
      insertBox = <InsertBox key={insertKey} editorX={201} editorY={1} selection={selection} insertBoxData={selection.insertBox} />
    }
    return <React.Fragment>
        <div className="editor">
          <Tray width={200} startDrag={this.startDrag}/>
          <div className="editor-colum" draggable={true} onDragStart={this.onDragStart}>
            <svg
              className="editor-svg"
              xmlns="http://www.w3.org/2000/svg"
              height={height}
              preserveAspectRatio="none"
              onClick={this.onClickHandler}
            >
              <ExpandedListBlockView
                  block={fileBody}
                  selection={this.props.selection}
                  isSelected={false} />
              <ActiveCursor selection={selection}/>
            </svg>
            { insertBox }
          </div>
      </div>
      <DragOverlay selection={selection}/>
    </React.Fragment>;
  }

  startDrag = (nodeBlock: NodeBlock, offsetX: number, offestY: number) => {
    this.props.selection.startDrag(nodeBlock, offsetX, offestY);
  }

  onClickHandler = (event: React.MouseEvent) => {
    let selection = this.props.selection;
    let x = event.pageX - 364; // Horrible hack
    selection.placeCursorByXYCoordinate(x, event.pageY);
  }

  clipboardHandler = (event: ClipboardEvent) => {
    let {selection} = this.props;
    if (event.type === 'copy' || event.type === 'cut') {
      if(event.target instanceof SVGElement) {
        let selectedNode = selection.selectedNode;
        if (selectedNode !== null) {
          let jsonNode = JSON.stringify(selectedNode.serialize());
          // Maybe change to selectedNode.generateCodeString()
          // once we have paste of text code supported.
          let friendlytext = jsonNode;
          event.clipboardData.setData('text/plain', friendlytext);
          event.clipboardData.setData(SPLOOT_MIME_TYPE, jsonNode);
          event.preventDefault();
        }
      }
    }
    if (event.type === 'cut') {
      selection.deleteSelectedNode();
    }
    if (event.type === 'paste') {
      let splootData = event.clipboardData.getData(SPLOOT_MIME_TYPE);
      if (splootData) {
        let node = deserializeNode(JSON.parse(splootData));
        let destinationCategory = selection.getPasteDestinationCategory();
        node = adaptNodeToPasteDestination(node, destinationCategory);
        if (node && selection.isCursor()) {
          selection.insertNodeAtCurrentCursor(node);
          event.preventDefault();
        } else if (node && selection.isSingleNode()) {
          selection.deleteSelectedNode();
          selection.insertNodeAtCurrentCursor(node);
          event.preventDefault();
        } else {
          // paste failed :(
        }
      }
    }
  }

  keyHandler = (event: KeyboardEvent) => {
    let { selection } = this.props;
    if (event.isComposing) {
      // IME composition, let it be captured by the insert box.
      return;
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.props.selection.deleteSelectedNode();
    }
    if (event.key === 'Tab') {
      // TODO: If we're in insert mode, handle the insert first.
      selection.moveCursorToNextInsert();
      event.preventDefault();
      event.cancelBubble = true;
    }
    switch (event.key) {
      case 'ArrowLeft':
        selection.moveCursorLeft();
        event.preventDefault();
        break;
      case 'ArrowRight':
        selection.moveCursorRight();
        event.preventDefault();
        break;
      case 'ArrowUp':
        selection.moveCursorUp();
        event.preventDefault();
        break;
      case 'ArrowDown':
        selection.moveCursorDown();
        event.preventDefault();
        break;
    }
  }

  onDragStart = (event: React.DragEvent) => {
    let x = event.screenX;
    let y = event.screenY;
    // TODO: Use coords to find correct node to drag.
    // For now just pick the first node that we know is there?
    let listBlock = this.props.block.renderedChildSets['body'].nodes[0].renderedChildSets['tokens'];
    let index = 0;
    let node = listBlock.nodes[0];
    // TODO: Remove selected node from the tree while it's being dragged.
    this.startDrag(node, 0, 0);
    event.preventDefault();
    event.stopPropagation();
  }

  componentDidMount() {
    document.addEventListener('keydown', this.keyHandler);
    document.addEventListener('cut', this.clipboardHandler);
    document.addEventListener('copy', this.clipboardHandler);
    document.addEventListener('paste', this.clipboardHandler);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyHandler);
    document.removeEventListener('cut', this.clipboardHandler);
    document.removeEventListener('copy', this.clipboardHandler);
    document.removeEventListener('paste', this.clipboardHandler);
  }
}