import './editor.css'

import { observer } from 'mobx-react'
import React from 'react'

import { NodeSelection } from '../context/selection'
import { adaptNodeToPasteDestination, deserializeNode } from '@splootcode/core/language/type_registry'
import { HTML_DOCUMENT } from '@splootcode/core/language/types/html/html_document'
import { JAVASCRIPT_FILE } from '@splootcode/core/language/types/js/javascript_file'
import { PYTHON_FILE } from '@splootcode/core/language/types/python/python_file'
import { NodeBlock } from '../layout/rendered_node'
import { ActiveCursor } from './cursor'
import { DragOverlay } from './drag_overlay'
import { InsertBox } from './insert_box'
import { ExpandedListBlockView } from './list_block'
import { Tray } from './tray'
import { EditBox } from './edit_box'

export const SPLOOT_MIME_TYPE = 'application/splootcodenode'

interface EditorProps {
  block: NodeBlock
  width: number
  selection: NodeSelection
}

@observer
export class Editor extends React.Component<EditorProps> {
  private editorSvgRef: React.RefObject<SVGSVGElement>

  constructor(props: EditorProps) {
    super(props)
    this.editorSvgRef = React.createRef()
  }

  render() {
    const { block, selection } = this.props
    let fileBody = null
    if (block.node.type === JAVASCRIPT_FILE || block.node.type === PYTHON_FILE || block.node.type === HTML_DOCUMENT) {
      fileBody = block.renderedChildSets['body']
    }
    const height = block.rowHeight + block.indentedBlockHeight
    let insertBox = null
    let editBox = null
    if (selection.isCursor() && selection.insertBox !== null) {
      insertBox = <InsertBox editorX={1} editorY={1} selection={selection} insertBoxData={selection.insertBox} />
    } else if (selection.isEditingSingleNode()) {
      // Whelp, this is ugly, but hey it works. :shrug:
      // This forces the insertbox to be regenerated and refocused when the insert changes position.
      editBox = <EditBox editorX={1} editorY={1} selection={selection} editBoxData={selection.editBox} />
    }
    return (
      <React.Fragment>
        <div className="editor">
          <Tray key={block.node.type} width={200} startDrag={this.startDrag} rootNode={block.node} />
          <div className="editor-column">
            <svg
              className="editor-svg"
              xmlns="http://www.w3.org/2000/svg"
              height={height}
              preserveAspectRatio="none"
              onClick={this.onClickHandler}
              ref={this.editorSvgRef}
            >
              <ExpandedListBlockView block={fileBody} selection={this.props.selection} isSelected={false} />
              <ActiveCursor selection={selection} />
            </svg>
            {insertBox}
            {editBox}
          </div>
        </div>
        <DragOverlay selection={selection} editorRef={this.editorSvgRef} />
      </React.Fragment>
    )
  }

  startDrag = (nodeBlock: NodeBlock, offsetX: number, offestY: number) => {
    this.props.selection.startDrag(nodeBlock, offsetX, offestY)
  }

  onClickHandler = (event: React.MouseEvent) => {
    const selection = this.props.selection
    const refBox = this.editorSvgRef.current.getBoundingClientRect()
    const x = event.pageX - refBox.left
    const y = event.pageY - refBox.top
    selection.handleClick(x, y)
    const insertbox = document.getElementById('insertbox') as HTMLInputElement
    if (insertbox) {
      insertbox.value = ''
      insertbox.focus()
    }
  }

  clipboardHandler = (event: ClipboardEvent) => {
    const { selection } = this.props
    if (event.type === 'copy' || event.type === 'cut') {
      if (event.target instanceof SVGElement) {
        const selectedNode = selection.selectedNode
        if (selectedNode !== null) {
          const jsonNode = JSON.stringify(selectedNode.serialize())
          // Maybe change to selectedNode.generateCodeString()
          // once we have paste of text code supported.
          const friendlytext = jsonNode
          event.clipboardData.setData('text/plain', friendlytext)
          event.clipboardData.setData(SPLOOT_MIME_TYPE, jsonNode)
          event.preventDefault()
        }
      }
    }
    if (event.type === 'cut') {
      selection.deleteSelectedNode()
    }
    if (event.type === 'paste') {
      const splootData = event.clipboardData.getData(SPLOOT_MIME_TYPE)
      if (splootData) {
        let node = deserializeNode(JSON.parse(splootData))
        const destinationCategory = selection.getPasteDestinationCategory()
        node = adaptNodeToPasteDestination(node, destinationCategory)
        if (node && selection.isCursor()) {
          selection.insertNodeAtCurrentCursor(node)
          event.preventDefault()
        } else if (node && selection.isSingleNode()) {
          selection.deleteSelectedNode()
          selection.insertNodeAtCurrentCursor(node)
          event.preventDefault()
        } else {
          // paste failed :(
        }
      }
    }
  }

  keyHandler = (event: KeyboardEvent) => {
    const { selection } = this.props
    if (event.isComposing) {
      // IME composition, let it be captured by the insert box.
      return
    }
    if (event.key === 'Backspace' || event.key === 'Delete') {
      this.props.selection.deleteSelectedNode()
    }
    if (event.key === 'Tab') {
      // TODO: If we're in insert mode, handle the insert first.
      selection.moveCursorToNextInsert()
      event.preventDefault()
      event.cancelBubble = true
    }
    if (event.key === 'Enter') {
      if (selection.isSingleNode()) {
        selection.startEditAtCurrentCursor()
      }
    }
    switch (event.key) {
      case 'ArrowLeft':
        selection.moveCursorLeft()
        event.preventDefault()
        break
      case 'ArrowRight':
        selection.moveCursorRight()
        event.preventDefault()
        break
      case 'ArrowUp':
        selection.moveCursorUp()
        event.preventDefault()
        break
      case 'ArrowDown':
        selection.moveCursorDown()
        event.preventDefault()
        break
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.keyHandler)
    document.addEventListener('cut', this.clipboardHandler)
    document.addEventListener('copy', this.clipboardHandler)
    document.addEventListener('paste', this.clipboardHandler)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.keyHandler)
    document.removeEventListener('cut', this.clipboardHandler)
    document.removeEventListener('copy', this.clipboardHandler)
    document.removeEventListener('paste', this.clipboardHandler)
  }
}
