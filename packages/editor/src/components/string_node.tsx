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
        d={`M ${x + 4} ${y} q -4,0 -4,4 v ${height - 8} q 0,4 4,4 h ${STRING_CAP_WIDTH - 6} v ${-height} z`}
      />
      <g transform={`translate(${x + 4} ${y + 6})`}>
        <path
          d="M3.35332 5.18303C3.66921 4.4662 3.99117 3.70077 4.31922 2.88674C4.64726 2.07271 4.92063 1.3498 5.13932 0.718018H6.9071L6.98 0.918488C6.70056 1.56242 6.33607 2.2671 5.88653 3.03254C5.43699 3.79797 4.99353 4.5148 4.55614 5.18303H3.35332ZM0 5.18303C0.315892 4.4662 0.643934 3.70077 0.984125 2.88674C1.32432 2.07271 1.59769 1.3498 1.80423 0.718018H3.55379L3.62668 0.918488C3.33509 1.56242 2.9706 2.2671 2.53321 3.03254C2.09582 3.79797 1.65843 4.5148 1.22104 5.18303H0Z"
          fill="var(--code-neutral-200)"
        />
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
        d={`M ${x} ${y} v ${height} h ${STRING_CAP_WIDTH - 6} q 4,0 4,-4 v ${-height + 8} q 0,-4 -4,-4 z`}
      />
      <g transform={`translate(${x + 3} ${y + 6})`}>
        <path
          d="M3.35332 5.18303C3.66921 4.4662 3.99117 3.70077 4.31922 2.88674C4.64726 2.07271 4.92063 1.3498 5.13932 0.718018H6.9071L6.98 0.918488C6.70056 1.56242 6.33607 2.2671 5.88653 3.03254C5.43699 3.79797 4.99353 4.5148 4.55614 5.18303H3.35332ZM0 5.18303C0.315892 4.4662 0.643934 3.70077 0.984125 2.88674C1.32432 2.07271 1.59769 1.3498 1.80423 0.718018H3.55379L3.62668 0.918488C3.33509 1.56242 2.9706 2.2671 2.53321 3.03254C2.09582 3.79797 1.65843 4.5148 1.22104 5.18303H0Z"
          fill="var(--code-neutral-200)"
        />
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
    const className = 'svgsplootnode' + (isSelected ? ' selected' : '') + (isValid ? '' : ' invalid')

    const internalWidth = block.blockWidth - STRING_CAP_WIDTH * 2

    let rectangle = null
    if (isSelected) {
      rectangle = (
        <rect
          ref={this.shapeRef}
          tabIndex={0}
          className="string-node-selected-background"
          x={leftPos + STRING_CAP_WIDTH - 2}
          y={topPos}
          width={internalWidth + 4}
          height={block.rowHeight}
        />
      )
    }

    const startCap = getLeftCapShape(className, leftPos, topPos, block.rowHeight)
    const endCap = getRightCapShape(className, leftPos + STRING_CAP_WIDTH + internalWidth + 2, topPos, block.rowHeight)

    const textContent = block.node.getProperty('value')

    return (
      <>
        {rectangle}
        {startCap}
        <foreignObject x={leftPos + STRING_CAP_WIDTH} y={topPos} width={internalWidth} height={block.rowHeight}>
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
