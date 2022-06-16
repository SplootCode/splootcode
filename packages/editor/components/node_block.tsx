import './node_block.css'

import React, { ReactElement } from 'react'
import { observer } from 'mobx-react'

import { AttachedChildRightExpressionView } from './attached_child'
import { ExpandedListBlockView } from './list_block'
import { InlineProperty } from './property'
import { InlineStringLiteral } from './string_literal'
import { LayoutComponent, LayoutComponentType, NodeBoxType } from '@splootcode/core/language/type_registry'
import { NODE_BLOCK_HEIGHT, NODE_INLINE_SPACING, NODE_TEXT_OFFSET } from '../layout/layout_constants'
import { NodeBlock, RenderedInlineComponent } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'
import { RepeatedBlockAnnotation, RuntimeAnnotation } from './runtime_annotations'
import { Separator } from './separator'
import { TokenListBlockView } from './token_list_block'
import { TreeListBlockBracketsView, TreeListBlockView } from './tree_list_block'

interface NodeBlockProps {
  block: NodeBlock
  selectionState: NodeSelectionState
  isInsideBreadcrumbs?: boolean
  isInvalidBlamed?: boolean
}

function getCapShape(className: string, x: number, y: number, width: number, leftCurve: boolean) {
  let leftSide: string
  if (leftCurve) {
    leftSide = `a 20 20 0 0 1 0 ${NODE_BLOCK_HEIGHT}`
  } else {
    leftSide = `q -4,0 -4,4 v ${NODE_BLOCK_HEIGHT - 8} q 0,4 4,4`
    width -= 4
    x += 4
  }

  return (
    <>
      <path className={className} d={`M ${x} ${y} ${leftSide} h ${width} v ${-NODE_BLOCK_HEIGHT} z`} />
      <line className={className + ' cap-line'} x1={x + width} y1={y} x2={x + width} y2={y + NODE_BLOCK_HEIGHT} />
    </>
  )
}

function getNodeShape(className: string, x: number, y: number, width: number, leftCurve: boolean, rightCurve: boolean) {
  let leftSide: string
  let rightSide: string
  if (leftCurve) {
    leftSide = `a 20 20 0 0 1 0 ${NODE_BLOCK_HEIGHT}`
  } else {
    leftSide = `q -4,0 -4,4 v ${NODE_BLOCK_HEIGHT - 8} q 0,4 4,4`
    width -= 4
    x += 4
  }

  if (rightCurve) {
    rightSide = `a 20 20 0 0 1 0 ${-NODE_BLOCK_HEIGHT}`
  } else {
    rightSide = `q 4,0 4,-4 v ${-NODE_BLOCK_HEIGHT + 8} q 0,-4 -4,-4`
    width -= 4
  }

  return <path className={className} d={`M ${x} ${y} ${leftSide} h ${width} ${rightSide} z`} />
}

@observer
export class EditorNodeBlock extends React.Component<NodeBlockProps> {
  private draggableRef: React.RefObject<SVGGElement>

  constructor(props) {
    super(props)
    this.draggableRef = React.createRef()
  }

  render() {
    const { block, selectionState, isInvalidBlamed } = this.props
    const isSelected = selectionState !== NodeSelectionState.UNSELECTED

    if (block === null) {
      return null
    }

    const width = block.blockWidth
    const leftPos = block.x + block.marginLeft
    const topPos = block.y + block.marginTop
    let internalLeftPos = leftPos + NODE_INLINE_SPACING

    let loopAnnotation = null
    if (block.node.isRepeatableBlock) {
      loopAnnotation = <RepeatedBlockAnnotation nodeBlock={block} />
    }

    const isValid = (block.isValid || block.invalidChildsetID) && !isInvalidBlamed
    const classname = 'svgsplootnode' + (isSelected ? ' selected' : '') + (isValid ? '' : ' invalid')

    let shape: ReactElement

    if (block.layout.boxType === NodeBoxType.INVISIBLE || block.layout.boxType === NodeBoxType.BRACKETS) {
      internalLeftPos = leftPos
      if (!isValid) {
        shape = (
          <rect
            className={'invisible-splootnode-invalid'}
            x={leftPos}
            y={topPos}
            height={NODE_BLOCK_HEIGHT}
            width={width}
            rx="4"
          />
        )
      } else {
        shape = null
      }
    } else if (block.layout.boxType === NodeBoxType.SMALL_BLOCK) {
      shape = getNodeShape(classname, leftPos, topPos, width, block.leftCurve, block.rightCurve)
      internalLeftPos = leftPos + NODE_INLINE_SPACING
    } else {
      shape = getNodeShape(classname, leftPos, topPos, width, block.leftCurve, block.rightCurve)
    }

    return (
      <g>
        {this.renderLeftAttachedBreadcrumbsChildSet()}
        {loopAnnotation}
        {shape}
        {block.renderedInlineComponents.map((renderedComponent: RenderedInlineComponent, idx: number) => {
          let result = null
          if (
            renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_BLOCK ||
            renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_STACK
          ) {
            // pass
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CAP) {
            result = (
              <>
                {getCapShape(classname, leftPos, topPos, renderedComponent.width, block.leftCurve)}
                <text x={internalLeftPos} y={topPos + NODE_TEXT_OFFSET} style={{ fill: block.textColor }}>
                  {renderedComponent.layoutComponent.identifier}
                </text>
              </>
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.STRING_LITERAL) {
            result = (
              <InlineStringLiteral
                key={idx}
                topPos={topPos}
                leftPos={internalLeftPos}
                block={block}
                propertyName={renderedComponent.layoutComponent.identifier}
                selectState={selectionState}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.PROPERTY) {
            result = (
              <InlineProperty
                key={idx}
                topPos={topPos}
                leftPos={internalLeftPos}
                block={block}
                propertyName={renderedComponent.layoutComponent.identifier}
                selectState={selectionState}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = <TreeListBlockBracketsView key={idx} childSetBlock={childSetBlock} isSelected={isSelected} />
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_TREE) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = <TreeListBlockView key={idx} childSetBlock={childSetBlock} isSelected={isSelected} />
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_TOKEN_LIST) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = (
              <TokenListBlockView
                key={idx}
                block={childSetBlock}
                isSelected={isSelected}
                isValid={block.invalidChildsetID !== renderedComponent.layoutComponent.identifier}
                isInline={block.layout.boxType !== NodeBoxType.INVISIBLE}
                invalidIndex={block.invalidChildsetIndex}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type == LayoutComponentType.SEPARATOR) {
            result = (
              <Separator
                key={idx}
                x={internalLeftPos}
                selectorType={renderedComponent.layoutComponent.identifier}
                y={topPos}
                isSelected={isSelected}
              />
            )
            internalLeftPos += renderedComponent.width
          } else {
            // Keywords and child separators left
            result = (
              <text x={internalLeftPos} y={topPos + NODE_TEXT_OFFSET} key={idx} style={{ fill: block.textColor }}>
                {renderedComponent.layoutComponent.identifier}
              </text>
            )
            internalLeftPos += renderedComponent.width
          }
          return result
        })}
        {this.renderRightAttachedChildSet()}
        {<RuntimeAnnotation nodeBlock={block} />}
        {block.indentedBlockHeight > 0 ? (
          <line
            x1={leftPos + 6}
            y1={block.y + block.marginTop + NODE_BLOCK_HEIGHT}
            x2={leftPos + 6}
            y2={block.y + block.rowHeight + block.indentedBlockHeight - 4}
            className={'indented-rule ' + (isSelected ? 'selected' : '')}
          />
        ) : null}
        {block.layout.components.map((layoutComponent: LayoutComponent, idx: number) => {
          if (layoutComponent.type === LayoutComponentType.CHILD_SET_BLOCK) {
            const childSetBlock = block.renderedChildSets[layoutComponent.identifier]
            const result = <ExpandedListBlockView key={idx} block={childSetBlock} isSelected={isSelected} />
            return result
          } else if (layoutComponent.type === LayoutComponentType.CHILD_SET_STACK) {
            const childSetBlock = block.renderedChildSets[layoutComponent.identifier]
            const result = <ExpandedListBlockView key={idx} block={childSetBlock} isSelected={isSelected} />
            return result
          }
        })}
      </g>
    )
  }

  renderLeftAttachedBreadcrumbsChildSet() {
    const { block } = this.props
    if (block.leftBreadcrumbChildSet === null) {
      return null
    }
    const childSetBlock = block.renderedChildSets[block.leftBreadcrumbChildSet]
    if (childSetBlock.nodes.length === 0) {
      const invalid = block.invalidChildsetID === block.leftBreadcrumbChildSet
      const classname = 'svgsplootnode gap' + (invalid ? ' invalid' : '')
      return <rect className={classname} x={block.x} y={block.y} height={NODE_BLOCK_HEIGHT} width={20} rx="4" />
      // return <path className={classname} d={getBreadcrumbStartShapePath(block.x, block.y, block.marginLeft)} />
    } else {
      return (
        <EditorNodeBlock
          block={childSetBlock.nodes[0]}
          selectionState={childSetBlock.getChildSelectionState(0)}
          isInsideBreadcrumbs={true}
        />
      )
    }
  }

  renderRightAttachedChildSet(): ReactElement {
    const { block, selectionState } = this.props
    const isSelected = selectionState === NodeSelectionState.SELECTED
    if (block.rightAttachedChildSet === null) {
      return null
    }
    const childSetBlock = block.renderedChildSets[block.rightAttachedChildSet]
    if (childSetBlock.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      return (
        <AttachedChildRightExpressionView
          childSetBlock={childSetBlock}
          isSelected={isSelected}
        ></AttachedChildRightExpressionView>
      )
    }
    return null
  }
}
