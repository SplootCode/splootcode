import './edit_box.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditBoxData } from '../context/edit_box'
import { NodeBoxType } from '@splootcode/core/language/type_registry'
import { NodeSelection } from '../context/selection'
import { stringLiteralDimensions, stringWidth } from '../layout/layout_constants'

interface EditBoxState {
  userInput: string
}

interface EditBoxProps {
  editorX: number
  editorY: number
  editBoxData: EditBoxData
  selection: NodeSelection
}

@observer
export class EditBox extends React.Component<EditBoxProps, EditBoxState> {
  editTextArea: React.RefObject<HTMLTextAreaElement>
  inputBox: React.RefObject<HTMLInputElement>

  constructor(props: EditBoxProps) {
    super(props)
    const editBoxData = this.props.editBoxData
    this.editTextArea = React.createRef()
    this.inputBox = React.createRef()

    this.state = {
      userInput: editBoxData.contents, // Get current edit value
    }
  }

  render() {
    const { userInput } = this.state
    const { editorX, editorY, editBoxData } = this.props
    const { x, y } = editBoxData
    const positionStyles: React.CSSProperties = {
      position: 'absolute',
      left: x + editorX - 1 + 'px',
      top: y + editorY + 'px',
    }
    if (editBoxData.node.layout.boxType === NodeBoxType.STRING) {
      return (
        <div style={positionStyles}>
          <div className="edit-box edit-box-string">
            <textarea
              ref={this.editTextArea}
              autoFocus
              defaultValue={userInput}
              onChange={this.onChange}
              onKeyDown={this.onKeyDown}
              onBlur={this.onBlur}
            />
          </div>
        </div>
      )
    }

    return (
      <div style={positionStyles}>
        <div className="edit-box">
          <input
            ref={this.inputBox}
            autoFocus
            type="text"
            value={userInput}
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            onBlur={this.onBlur}
          />
        </div>
      </div>
    )
  }

  onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { selection } = this.props

    // Escape
    if (e.key === 'Escape') {
      selection.exitEdit()
    }

    if (e.key === 'Backspace' && this.state.userInput === '') {
      selection.exitEdit()
      selection.deleteSelectedNode()
    }

    if (e.key === 'Enter' && e.shiftKey && this.props.editBoxData.node.layout.boxType === NodeBoxType.STRING) {
      // Let it through (newline character)
    } else {
      // Enter key or Space
      if (e.key === 'Enter' || e.key === 'Space') {
        e.preventDefault()
        const userInput = e.currentTarget.value
        this.props.selection.updatePropertyEdit(userInput)
        selection.exitEdit()
      }
    }

    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }

  onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const selection = this.props.selection
    selection.exitEdit()
  }

  onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const userInput = e.currentTarget.value
    const sanitizedValue = this.props.selection.updatePropertyEdit(userInput)
    this.setState({
      userInput: sanitizedValue,
    })
  }

  adjustDimensionsToContent = () => {
    if (this.editTextArea.current) {
      const textArea = this.editTextArea.current
      const [width, height] = stringLiteralDimensions(this.state.userInput)
      textArea.style.width = Math.max(2, width) + 'px'
      textArea.style.height = height + 'px'
    } else if (this.inputBox.current) {
      const inp = this.inputBox.current
      inp.style.width = stringWidth(this.state.userInput) + 2 + 'px'
    }
  }

  componentDidMount(): void {
    this.adjustDimensionsToContent()
  }

  componentDidUpdate(prevProps: Readonly<EditBoxProps>, prevState: Readonly<EditBoxState>, snapshot?: any): void {
    this.adjustDimensionsToContent()
  }
}
