import './edit_box.css'

import { observer } from 'mobx-react'
import React from 'react'

import { NodeSelection } from '../context/selection'
import { EditBoxData } from '../context/edit_box'
import { stringWidth } from '../layout/rendered_childset_block'

interface EditBoxState {
  userInput: string
  autoWidth: number
}

interface EditBoxProps {
  editorX: number
  editorY: number
  editBoxData: EditBoxData
  selection: NodeSelection
}

@observer
export class EditBox extends React.Component<EditBoxProps, EditBoxState> {
  constructor(props: EditBoxProps) {
    super(props)
    const editBoxData = this.props.editBoxData

    this.state = {
      userInput: editBoxData.contents, // Get current edit value
      autoWidth: this.getWidth(editBoxData.contents),
    }
  }

  render() {
    const { userInput, autoWidth } = this.state
    const { editorX, editorY, editBoxData } = this.props
    const { x, y } = editBoxData
    const adjustX = 15
    const adjustY = 2
    const positionStyles: React.CSSProperties = {
      position: 'absolute',
      left: x + editorX - 2 + adjustX + 'px',
      top: y + editorY + 1 + adjustY + 'px',
    }

    return (
      <div style={positionStyles}>
        <div className={'edit-box'}>
          <input
            autoFocus
            type="text"
            defaultValue={userInput}
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            onBlur={this.onBlur}
            style={{ width: autoWidth }}
          />
        </div>
      </div>
    )
  }

  onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { selection } = this.props

    // Escape
    if (e.key === 'Escape') {
      selection.exitEdit()
    }

    // Enter key or Space
    if (e.key === 'Enter' || e.key === 'Space') {
      selection.exitEdit()
    }

    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
  }

  onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const selection = this.props.selection
    selection.exitEdit()
  }

  getWidth = (input: string) => {
    return stringWidth(input) + 5
  }

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.currentTarget.value
    this.setState({
      userInput: userInput,
      autoWidth: this.getWidth(userInput),
    })
    this.props.selection.updatePropertyEdit(userInput)
  }
}
