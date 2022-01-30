import React from 'react'

import { NodeBlock } from '../layout/rendered_node'
import { observer } from 'mobx-react'

import './runtime_annotations.css'
import {
  AssignmentAnnotation,
  NodeAnnotation,
  NodeAnnotationType,
  ParseErrorAnnotation,
  ReturnValueAnnotation,
  RuntimeErrorAnnotation,
  SideEffectAnnotation,
} from '@splootcode/core/language/annotations/annotations'
import { formatPythonAssingment, formatPythonReturnValue } from '@splootcode/core/language/types/python/utils'
import { stringWidth } from '../layout/rendered_childset_block'

interface RepeatedBlockAnnotationProps {
  nodeBlock: NodeBlock
}

@observer
export class RepeatedBlockAnnotation extends React.Component<RepeatedBlockAnnotationProps> {
  private sliderRef: React.RefObject<SVGGElement>

  constructor(props: RepeatedBlockAnnotationProps) {
    super(props)
    this.sliderRef = React.createRef()
  }

  render() {
    const block = this.props.nodeBlock
    const loopAnnotation = block.loopAnnotation
    if (!loopAnnotation) {
      return null
    }
    const frames = loopAnnotation.iterations
    const currentFrame = loopAnnotation.currentFrame || 0

    const selected = currentFrame > frames - 1 || currentFrame === -1 ? frames - 1 : currentFrame
    let label = `${loopAnnotation.label} ${frames} times`
    let numLabel = `${selected + 1}`
    if (block.node.type === 'PYTHON_WHILE_LOOP') {
      label = `${loopAnnotation.label} ${frames - 1} times`
      numLabel = selected == frames - 1 ? 'end' : numLabel
    }

    if (frames > 1) {
      const dotX = block.x + 6 + stringWidth(label)
      const width = Math.min(frames * 10, 200)
      const location = (selected / (frames - 1)) * width
      const numLabelWidth = Math.max(stringWidth('end'), stringWidth(`${frames}`)) + 24
      return (
        <g>
          <text x={block.x + 2} y={block.y + 8} className="annotation" xmlSpace="preserve">
            {label}
          </text>
          <g transform={`translate(${dotX} ${block.y + 2})`} onClick={this.clickHandler} ref={this.sliderRef}>
            <rect className="slider-background" x={-8} y={-6} width={width + 16} height={14} />
            <rect className="slider-track" width={width} height="3" />
            <rect className="slider-fill" width={location} height="3" />
            <circle className="slider-handle" cx={location} cy={1} r={6} />
          </g>
          <g transform={`translate(${dotX} ${block.y + 2})`}>
            <text
              className="annotation"
              x={width + 18 + numLabelWidth / 2}
              y={6}
              textAnchor="middle"
              xmlSpace="preserve"
            >
              {numLabel}
            </text>
            <rect
              className="slider-button"
              rx="2"
              x={width + 10}
              y={-6}
              width={15}
              height={16}
              onClick={this.decrement}
            />
            <text className="slider-button-label" x={width + 14} y={7}>
              &lt;
            </text>
            <rect
              className="slider-button"
              rx="2"
              x={width + 10 + numLabelWidth}
              y={-6}
              width={15}
              height={16}
              onClick={this.increment}
            />
            <text className="slider-button-label" x={width + 14 + numLabelWidth} y={7}>
              &gt;
            </text>
          </g>
        </g>
      )
    }
    return (
      <g>
        <text x={block.x + 2} y={block.y + 8} className="annotation" xmlSpace="preserve">
          {label}
        </text>
      </g>
    )
  }

  clickHandler = (event: React.MouseEvent) => {
    event.stopPropagation()
    const dim = this.sliderRef.current.getBoundingClientRect()
    let x = event.clientX - dim.left - 8

    const block = this.props.nodeBlock
    const frames = block.loopAnnotation.iterations
    const width = Math.min((frames - 1) * 10, 200)
    x = Math.min(width, Math.max(x, 0))
    const idx = Math.floor((x / width) * frames)
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx)
  }

  increment = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.nativeEvent.cancelBubble = true
    const current = this.props.nodeBlock.loopAnnotation.currentFrame
    if (current == -1) {
      return
    }
    const idx = Math.min(current + 1, this.props.nodeBlock.loopAnnotation.iterations - 1)
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx)
  }

  decrement = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.nativeEvent.cancelBubble = true
    let current = this.props.nodeBlock.loopAnnotation.currentFrame
    if (current == -1) {
      current = this.props.nodeBlock.loopAnnotation.iterations - 1
    }
    const idx = Math.max(current - 1, 0)
    this.props.nodeBlock.selectRuntimeCaptureFrame(idx)
  }
}

interface RuntimeAnnotationProps {
  nodeBlock: NodeBlock
}

function annotationToString(annotation: NodeAnnotation): string {
  switch (annotation.type) {
    case NodeAnnotationType.Assignment:
      return formatPythonAssingment(annotation.value as AssignmentAnnotation)
    case NodeAnnotationType.SideEffect:
      return (annotation.value as SideEffectAnnotation).message
    case NodeAnnotationType.ReturnValue:
      return formatPythonReturnValue(annotation.value as ReturnValueAnnotation)
    case NodeAnnotationType.RuntimeError:
      const val = annotation.value as RuntimeErrorAnnotation
      if (val.errorType === 'EOFError') {
        return 'No input, run the program to enter input.'
      }
      return `${val.errorType}: ${val.errorMessage}`
    case NodeAnnotationType.ParseError:
      const val2 = annotation.value as ParseErrorAnnotation
      return val2.message
  }
}

@observer
export class RuntimeAnnotation extends React.Component<RuntimeAnnotationProps> {
  render() {
    const block = this.props.nodeBlock
    const annotations = block.runtimeAnnotations
    if (annotations.length != 0) {
      const x = block.x + block.rowWidth + 8
      let y = block.y + block.marginTop + 20 - (annotations.length - 1) * 8
      return (
        <g>
          {annotations.map((annotation, i) => {
            const text = annotationToString(annotation)
            const className =
              annotation.type === NodeAnnotationType.RuntimeError || annotation.type === NodeAnnotationType.ParseError
                ? 'error-annotation'
                : 'annotation'
            const entry = (
              <text x={x} y={y} key={i} className={className} xmlSpace="preserve">
                {text}
              </text>
            )
            y += 16
            return entry
          })}
        </g>
      )
    }
    return null
  }
}
