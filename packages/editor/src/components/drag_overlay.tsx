import './drag_overlay.css'

import React from 'react'
import { observer } from 'mobx-react'

import { FragmentView } from './fragment'
import { NodeSelection } from '../context/selection'
import { RenderedFragment } from '../layout/rendered_fragment'

interface OverlayProps {
  selection: NodeSelection
  editorRef: React.RefObject<SVGSVGElement>
}

@observer
export class DragOverlay extends React.Component<OverlayProps> {
  render() {
    const { selection, editorRef } = this.props
    const dragState = selection.dragState
    const fragment = dragState?.node
    if (!dragState || fragment === null) {
      return <div style={{ display: 'none' }} />
    }
    return (
      <DragOverlayInternal
        fragment={fragment}
        initialX={0}
        initialY={0}
        onEndDrag={this.onEndDrag}
        selection={selection}
        editorRef={editorRef}
      />
    )
  }

  onEndDrag = () => {
    this.props.selection.endDrag()
  }
}

interface DragOverlayInternalProps {
  fragment: RenderedFragment
  onEndDrag: () => any
  initialX: number
  initialY: number
  selection: NodeSelection
  editorRef: React.RefObject<SVGSVGElement>
}

interface DragOverlayInternalState {
  x: number
  y: number
}

class DragOverlayInternal extends React.Component<DragOverlayInternalProps, DragOverlayInternalState> {
  constructor(props) {
    super(props)
    this.state = {
      x: this.props.initialX,
      y: this.props.initialY,
    }
  }

  render() {
    const { fragment } = this.props
    const { x, y } = this.state
    return (
      <div onMouseUp={this.onMouseUp} onMouseMove={this.onMouseMove}>
        <svg
          className="drag-overlay"
          xmlns="http://www.w3.org/2000/svg"
          height={window.innerHeight}
          width={window.innerWidth}
          preserveAspectRatio="none"
        >
          <g transform={`translate(${x} ${y})`}>
            <FragmentView fragment={fragment} />
          </g>
        </svg>
      </div>
    )
  }

  onMouseUp = (event: React.MouseEvent) => {
    const { selection, fragment, editorRef } = this.props

    const refBox = editorRef.current.getBoundingClientRect()
    const x = event.pageX - refBox.left
    const y = event.pageY - refBox.top

    selection.placeCursorByXYCoordinate(x, y)
    selection.insertFragment(fragment.fragment.clone())
    this.props.onEndDrag()
  }

  onMouseMove = (event: React.MouseEvent) => {
    if (event.buttons === 0) {
      this.props.onEndDrag()
    } else {
      const { selection } = this.props
      this.setState({
        x: event.pageX,
        y: event.pageY,
      })
      const refBox = this.props.editorRef.current.getBoundingClientRect()
      const x = event.pageX - refBox.left
      const y = event.pageY - refBox.top

      // TODO: Only allow cursors in positions that make sense.
      selection.placeCursorByXYCoordinate(x, y)
    }
  }
}
