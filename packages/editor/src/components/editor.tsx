import './editor.css'
import 'allotment/dist/style.css'

import React, { ReactNode } from 'react'
import { observer } from 'mobx-react'

import { ActiveCursor } from './cursor'
import { DragOverlay } from './drag_overlay'
import { EditBox } from './edit_box'
import { EditorHostingConfig } from '../editor_hosting_config'
import { EditorSideMenuView } from './editor_side_menu'
import { ExpandedListBlockView } from './list_block'
import { InsertBox } from './insert_box'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from '../context/selection'
import { Project, SplootPackage, ValidationWatcher, deserializeFragment } from '@splootcode/core'
import { RuntimeToken } from '../runtime/python_frame'

export const SPLOOT_MIME_TYPE = 'application/splootcodenode'

interface EditorProps {
  block: NodeBlock
  project: Project
  pkg: SplootPackage
  selection: NodeSelection
  validationWatcher: ValidationWatcher
  banner?: ReactNode
  editorHostingConfig: EditorHostingConfig
  refreshToken?: () => Promise<RuntimeToken>
}

interface EditorState {
  visibleView: EditorSideMenuView
}

@observer
export class Editor extends React.Component<EditorProps, EditorState> {
  private editorSvgRef: React.RefObject<SVGSVGElement>
  private editorColumnRef: React.RefObject<HTMLDivElement>

  state = {
    visibleView: 'tray' as EditorSideMenuView,
  }

  constructor(props: EditorProps) {
    super(props)
    this.editorSvgRef = React.createRef()
    this.editorColumnRef = React.createRef()
  }

  render() {
    const { block, selection, banner } = this.props
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
    return (
      <React.Fragment>
        <div className="editor-column">
          {banner}
          <div
            className="editor-box"
            ref={this.editorColumnRef}
            onBlur={this.onBlurHandler}
            onFocus={this.onFocusHandler}
          >
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
        <DragOverlay selection={selection} editorRef={this.editorSvgRef} />
      </React.Fragment>
    )
  }

  onClickHandler = (event: React.MouseEvent) => {
    const selection = this.props.selection
    const refBox = this.editorSvgRef.current.getBoundingClientRect()
    const x = event.pageX - refBox.left
    const y = event.pageY - refBox.top
    selection.handleClick(x, y, event.shiftKey)
  }

  onBlurHandler = (event: React.FocusEvent) => {
    if (!this.editorColumnRef.current.contains(event.relatedTarget)) {
      this.props.selection.clearSelection()
    }
  }

  onFocusHandler = (event: React.FocusEvent) => {
    if (this.props.selection.isEmpty()) {
      this.props.selection.placeCursorByXYCoordinate(0, 0)
    }
  }

  clipboardHandler = (event: ClipboardEvent) => {
    const { selection } = this.props

    // If the selection is empty, we don't have focus.
    if (this.props.selection.isEmpty()) {
      return
    }

    if (event.type === 'copy' || event.type === 'cut') {
      const docSelection = document.getSelection()
      if (this.editorColumnRef.current.contains(docSelection.focusNode)) {
        const selectedFragment = selection.copyCurrentSelection()
        if (selectedFragment !== null) {
          const jsonNode = JSON.stringify(selectedFragment.serialize())
          // Maybe change to selectedNode.generateCodeString()
          // once we have paste of text code supported.
          const friendlytext = jsonNode
          event.clipboardData.setData('text/plain', friendlytext)
          event.clipboardData.setData(SPLOOT_MIME_TYPE, jsonNode)
          event.preventDefault()
          if (event.type === 'cut') {
            selection.deleteSelectedNode()
          }
        }
      }
    }
    if (event.type === 'paste') {
      const splootData = event.clipboardData.getData(SPLOOT_MIME_TYPE)
      if (splootData) {
        const fragment = deserializeFragment(JSON.parse(splootData))
        selection.insertFragment(fragment)
        event.preventDefault()
      }
    }
  }

  keyHandler = (event: KeyboardEvent) => {
    // If the selection is empty then the editor does not have focus.
    if (this.props.selection.isEmpty()) {
      return
    }

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
          selection.editSelectionLeft()
          event.preventDefault()
          return
        case 'ArrowRight':
          selection.editSelectionRight()
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
        selection.moveCursorUp(event.shiftKey)
        event.preventDefault()
        break
      case 'ArrowDown':
        selection.moveCursorDown(event.shiftKey)
        event.preventDefault()
        break
      case 'Home':
        selection.moveCursorToStartOfLine(event.shiftKey)
        event.preventDefault()
        break
      case 'End':
        selection.moveCursorToEndOfLine(event.shiftKey)
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
