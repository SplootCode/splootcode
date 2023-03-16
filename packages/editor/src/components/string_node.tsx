import React from 'react'
import { observer } from 'mobx-react'

import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'
import { STRING_CAP_WIDTH } from '../layout/layout_constants'

import './string_node.css'

interface StringNodeProps {
  block: NodeBlock
  selectionState: NodeSelectionState
  isInsideBreadcrumbs?: boolean
  isInvalidBlamed?: boolean
}

export function getLeftCapShape(className: string, x: number, y: number, height: number) {
  return (
    <>
      <path
        tabIndex={0}
        className={className}
        d={`M ${x + 4} ${y} q -4,0 -4,4 v ${height - 8} q 0,4 4,4 h ${STRING_CAP_WIDTH - 7} v ${-height} z`}
      />
      <g transform={`translate(${x} ${y + 14})`}>
        <text className="string-node-cap-text">&apos;</text>
      </g>
    </>
  )
}

function getRightCapShape(className: string, x: number, y: number, height: number) {
  return (
    <>
      <path
        tabIndex={0}
        className={className}
        d={`M ${x} ${y} v ${height} h ${STRING_CAP_WIDTH - 7} q 4,0 4,-4 v ${-height + 8} q 0,-4 -4,-4 z`}
      />
      <g transform={`translate(${x} ${y + 14})`}>
        <text className="string-node-cap-text">&apos;</text>
      </g>
    </>
  )
}

@observer
export class StringNode extends React.Component<StringNodeProps> {
  shapeRef = React.createRef<SVGRectElement>()

  constructor(props: StringNodeProps) {
    super(props)
    this.shapeRef = React.createRef()
  }

  render() {
    const { block, selectionState, isInvalidBlamed } = this.props
    const isSelected = selectionState !== NodeSelectionState.UNSELECTED
    const leftPos = block.x + block.marginLeft
    const topPos = block.y + block.marginTop

    const isValid = (block.isValid || block.invalidChildsetID) && !isInvalidBlamed
    const className = 'svgsplootnode stringnode' + (isSelected ? ' selected' : '') + (isValid ? '' : ' invalid')

    const internalWidth = block.blockWidth - STRING_CAP_WIDTH * 2

    const rectangle = (
      <rect
        ref={this.shapeRef}
        tabIndex={0}
        className={isSelected ? 'string-node-selected-background' : 'string-node-background'}
        x={leftPos + STRING_CAP_WIDTH - 4}
        y={topPos}
        width={internalWidth + 8}
        height={block.rowHeight}
      />
    )

    const startCap = getLeftCapShape(className, leftPos, topPos, block.rowHeight)
    const endCap = getRightCapShape(className, leftPos + STRING_CAP_WIDTH + internalWidth + 3, topPos, block.rowHeight)

    const textContent = block.node.getProperty('value')

    return (
      <>
        {rectangle}
        {startCap}
        <foreignObject x={leftPos + STRING_CAP_WIDTH + 1} y={topPos} width={internalWidth} height={block.rowHeight}>
          <pre tabIndex={0} className="string-node">
            {textContent}
          </pre>
        </foreignObject>
        {endCap}
      </>
    )
  }

  componentDidMount(): void {
    if (this.props.selectionState === NodeSelectionState.SELECTED) {
      this.shapeRef.current?.focus()
    }
  }

  componentDidUpdate(prevProps: Readonly<StringNodeProps>): void {
    if (
      this.props.selectionState === NodeSelectionState.SELECTED &&
      prevProps.selectionState !== NodeSelectionState.SELECTED &&
      this.shapeRef.current != null
    ) {
      this.shapeRef.current.focus()
    }
  }
}
