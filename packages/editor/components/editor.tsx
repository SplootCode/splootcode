import './editor.css'
import 'allotment/dist/style.css'

import React, { ReactNode } from 'react'
import { observer } from 'mobx-react'

import { ActiveCursor } from './cursor'
import { Allotment } from 'allotment'
import { DragOverlay } from './drag_overlay'
import { EditBox } from './edit_box'
import { ExpandedListBlockView } from './list_block'
import { InsertBox } from './insert_box'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from '../context/selection'
import { PythonFrame } from '../runtime/python_frame'
import { RenderedFragment } from '../layout/rendered_fragment'
import { SplootPackage } from '@splootcode/core/language/projects/package'
import { Tray } from './tray/tray'
import { ValidationWatcher } from '@splootcode/core/language/validation/validation_watcher'
import { deserializeNode } from '@splootcode/core/language/type_registry'

export const SPLOOT_MIME_TYPE = 'application/splootcodenode'

interface EditorProps {
  block: NodeBlock
  pkg: SplootPackage
  selection: NodeSelection
  validationWatcher: ValidationWatcher
  banner?: ReactNode
}

@observer
export class Editor extends React.Component<EditorProps> {
  private editorSvgRef: React.RefObject<SVGSVGElement>

  constructor(props: EditorProps) {
    super(props)
    this.editorSvgRef = React.createRef()
  }

  render() {
    const { block, pkg, selection, validationWatcher, banner } = this.props
    let fileBody = null

    fileBody = block.renderedChildSets['body']

    const height = block.rowHeight + block.indentedBlockHeight
    let insertBox = null
    let editBox = null
    if (selection.isCursor() && selection.insertBox !== null) {
      insertBox = (
        <InsertBox
          editorX={0}
          editorY={0}
          selection={selection}
          cursorPosition={selection.cursor}
          insertBoxData={selection.insertBox}
        />
      )
    } else if (selection.isEditingSingleNode()) {
      editBox = <EditBox editorX={1} editorY={1} selection={selection} editBoxData={selection.editBox} />
    }
    const startSize = window.outerWidth - 270 - 360
    return (
      <React.Fragment>
        <div className="editor">
          <Allotment defaultSizes={[270, startSize, 360]} minSize={180} proportionalLayout={false}>
            <Tray key={block.node.type} width={200} startDrag={this.startDrag} rootNode={block.node} />
            <div className="editor-column">
              {banner}
              <div className="editor-box">
                <svg
                  className="editor-svg"
                  xmlns="http://www.w3.org/2000/svg"
                  height={height}
                  preserveAspectRatio="none"
                  onClick={this.onClickHandler}
                  ref={this.editorSvgRef}
                >
                  <ExpandedListBlockView block={fileBody} isSelected={false} />
                  <ActiveCursor selection={selection} />
                </svg>
                {insertBox}
                {editBox}
              </div>
            </div>
            <div className="python-preview-panel">
              <PythonFrame pkg={pkg} validationWatcher={validationWatcher} />
            </div>
          </Allotment>
        </div>
        <DragOverlay selection={selection} editorRef={this.editorSvgRef} />
      </React.Fragment>
    )
  }

  startDrag = (fragment: RenderedFragment, offsetX: number, offestY: number) => {
    this.props.selection.startDrag(fragment, offsetX, offestY)
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
        const selectedFragment = selection.getSelectedFragment()
        if (selectedFragment !== null) {
          const jsonNode = JSON.stringify(selectedFragment.serialize())
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
        const node = deserializeNode(JSON.parse(splootData))
        if (selection.isCursor()) {
          selection.insertNodeAtCurrentCursor(node)
        } else if (selection.isSingleNode()) {
          selection.replaceOrWrapSelectedNode(node)
        } else {
          // paste failed :(
        }
        event.preventDefault()
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
      // Must stop backspace propagation for people who use 'Go back with backspace' browser extension.
      event.stopPropagation()
      this.props.selection.deleteSelectedNode()
    }

    if (event.key === 'Enter') {
      if (selection.isSingleNode()) {
        // Need to wait until key press is finished before creating the edit box.
        setTimeout(() => {
          selection.startEditAtCurrentCursor()
        }, 0)
      }
    }

    if (event.shiftKey) {
      switch (event.key) {
        case 'ArrowLeft':
          selection.expandSelectionLeft()
          event.preventDefault()
          return
        case 'ArrowRight':
          selection.expandSelectionRight()
          event.preventDefault()
          return
        case 'ArrowDown':
          selection.expandSelectionDown()
          event.preventDefault()
          return
        case 'ArrowUp':
          selection.expandSelectionUp()
          event.preventDefault()
          return
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
      case 'Home':
        selection.moveCursorToStartOfLine()
        event.preventDefault()
        break
      case 'End':
        selection.moveCursorToEndOfLine()
        event.preventDefault()
        break
      case 'Tab':
        selection.moveCursorToNextInsert(event.shiftKey)
        event.preventDefault()
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
