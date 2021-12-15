import './node_block.css'

import { observer } from 'mobx-react'
import React, { ReactElement } from 'react'

import { NodeSelection, NodeSelectionState } from '../context/selection'
import { LayoutComponent, LayoutComponentType } from '@splootcode/core/language/type_registry'
import { SPLOOT_EXPRESSION } from '@splootcode/core/language/types/js/expression'
import { PYTHON_EXPRESSION } from '@splootcode/core/language/types/python/python_expression'
import { NodeBlock, RenderedInlineComponent } from '../layout/rendered_node'
import { AttachedChildRightExpressionView } from './attached_child'
import { SplootExpressionView } from './expression'
import { ExpandedListBlockView, InlineListBlockView } from './list_block'
import { InlineProperty } from './property'
import { InlineStringLiteral } from './string_literal'
import { TreeListBlockBracketsView, TreeListBlockView } from './tree_list_block'
import { LoopAnnotation } from './runtime_annotations'

interface NodeBlockProps {
  block: NodeBlock
  selection: NodeSelection
  selectionState: NodeSelectionState
  isInsideBreadcrumbs?: boolean
}

function getBreadcrumbStartShapePath(x: number, y: number, width: number): string {
  return `M ${x + 3} ${y}
  h ${width - 12}
  c 1, 0, 4, 0, 5, 3
  l 6, 11
  l -6, 11
  c -2, 3, -4, 3, -5, 3
  h -${width - 12}
  c -1.5, 0, -3, -1.5, -3, -3
  v -22
  c 0, -1.5, 1.5, -3, 3, -3
  z`
}

function getBreadcrumbEndShapePath(x: number, y: number, width: number): string {
  return `
  M ${x + 3} ${y}
  h ${width - 8}
  c 1.5, 0, 3, 1.5, 3, 3
  v 22
  c 0, 1.5, -1.5, 3, -3, 3
  h -${width - 8}
  c -4, 0, -6.5, -0.5, -5, -3
  l 6 -11
  l -6 -11
  c -1.5, -2.5, -1, -3, 5, -3
  z`
}

function getBreadcrumbMiddleShapePath(x: number, y: number, width: number): string {
  return `
  M ${x + 3} ${y}
  h ${width - 12}
  c 1, 0, 4, 0, 5, 3
  l 6, 11
  l -6, 11
  c -2, 3, -4, 3, -5, 3
  h -${width - 12}
  c -4, 0, -6.5, -0.5, -5, -3
  l 6 -11
  l -6 -11
  c -1.5, -2.5, -1, -3, 5, -3
  z`
}

@observer
export class EditorNodeBlock extends React.Component<NodeBlockProps> {
  private draggableRef: React.RefObject<SVGGElement>

  constructor(props) {
    super(props)
    this.draggableRef = React.createRef()
  }

  render() {
    const { block, selection, selectionState } = this.props
    const isSelected = selectionState !== NodeSelectionState.UNSELECTED

    if (block === null) {
      return null
    }

    const width = block.blockWidth
    const leftPos = block.x + block.marginLeft
    const topPos = block.y + block.marginTop
    let internalLeftPos = leftPos + 10

    if (block.node.type === SPLOOT_EXPRESSION || block.node.type === PYTHON_EXPRESSION) {
      return <SplootExpressionView block={block} selection={selection} selectionState={selectionState} />
    }

    let loopAnnotation = null
    if (block.node.isLoop) {
      loopAnnotation = <LoopAnnotation nodeBlock={block} />
    }

    let shape: ReactElement
    if (this.props.isInsideBreadcrumbs) {
      if (block.leftBreadcrumbChildSet) {
        shape = (
          <path
            className={'svgsplootnode' + (isSelected ? ' selected' : '')}
            d={getBreadcrumbMiddleShapePath(leftPos + 1, topPos + 1, width)}
          />
        )
      } else {
        shape = (
          <path
            className={'svgsplootnode' + (isSelected ? ' selected' : '')}
            d={getBreadcrumbStartShapePath(leftPos + 1, topPos + 1, width)}
          />
        )
      }
    } else {
      if (block.leftBreadcrumbChildSet) {
        shape = (
          <path
            className={'svgsplootnode' + (isSelected ? ' selected' : '')}
            d={getBreadcrumbEndShapePath(leftPos + 1, topPos + 1, width)}
          />
        )
      } else {
        if (block.layout.small) {
          shape = (
            <rect
              className={'svgsplootnode' + (isSelected ? ' selected' : '')}
              x={leftPos + 1}
              y={topPos + 5}
              height="21"
              width={width}
              rx="4"
            />
          )
          internalLeftPos = leftPos + 8
        } else {
          shape = (
            <rect
              className={'svgsplootnode' + (isSelected ? ' selected' : '')}
              x={leftPos + 1}
              y={topPos + 1}
              height="28"
              width={width}
              rx="4"
            />
          )
        }
      }
    }

    return (
      <g>
        {this.renderLeftAttachedBreadcrumbsChildSet()}
        {loopAnnotation}
        {shape}
        {block.renderedInlineComponents.map((renderedComponent: RenderedInlineComponent, idx: number) => {
          let result = null
          if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_BLOCK) {
            // pass
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.STRING_LITERAL) {
            result = (
              <InlineStringLiteral
                key={idx}
                topPos={topPos}
                leftPos={internalLeftPos}
                block={block}
                propertyName={renderedComponent.layoutComponent.identifier}
                selectState={selectionState}
                selection={selection}
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
                selection={selection}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_TREE_BRACKETS) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = (
              <TreeListBlockBracketsView
                key={idx}
                block={childSetBlock}
                isSelected={isSelected}
                selection={this.props.selection}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_TREE) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = (
              <TreeListBlockView
                key={idx}
                block={childSetBlock}
                isSelected={isSelected}
                selection={this.props.selection}
              />
            )
            internalLeftPos += renderedComponent.width
          } else if (renderedComponent.layoutComponent.type === LayoutComponentType.CHILD_SET_INLINE) {
            const childSetBlock = block.renderedChildSets[renderedComponent.layoutComponent.identifier]
            result = (
              <InlineListBlockView
                key={idx}
                block={childSetBlock}
                isSelected={isSelected}
                selection={this.props.selection}
              />
            )
            internalLeftPos += renderedComponent.width
          } else {
            // Keywords and child separators left
            result = (
              <text x={internalLeftPos} y={topPos + 20} key={idx} style={{ fill: block.textColor }}>
                {renderedComponent.layoutComponent.identifier}
              </text>
            )
            internalLeftPos += renderedComponent.width
          }
          return result
        })}
        {this.renderRightAttachedChildSet()}
        {block.indentedBlockHeight > 0 ? (
          <line
            x1={leftPos + 6}
            y1={block.y + block.rowHeight + 4}
            x2={leftPos + 6}
            y2={block.y + block.rowHeight + block.indentedBlockHeight}
            className={'indented-rule ' + (isSelected ? 'selected' : '')}
          />
        ) : null}
        {block.layout.components.map((layoutComponent: LayoutComponent, idx: number) => {
          if (layoutComponent.type === LayoutComponentType.CHILD_SET_BLOCK) {
            const childSetBlock = block.renderedChildSets[layoutComponent.identifier]
            const result = (
              <ExpandedListBlockView
                key={idx}
                block={childSetBlock}
                isSelected={isSelected}
                selection={this.props.selection}
              />
            )
            return result
          }
        })}
      </g>
    )
  }

  renderLeftAttachedBreadcrumbsChildSet() {
    const { block, selection, selectionState } = this.props
    if (block.leftBreadcrumbChildSet === null) {
      return null
    }
    const isSelected = selectionState === NodeSelectionState.SELECTED
    const childSetBlock = block.renderedChildSets[block.leftBreadcrumbChildSet]
    return (
      <InlineListBlockView
        key={'breadcrumbsleft'}
        isInsideBreadcrumbs={true}
        block={childSetBlock}
        isSelected={isSelected}
        selection={selection}
      />
    )
  }

  renderRightAttachedChildSet(): ReactElement {
    const { block, selection, selectionState } = this.props
    const isSelected = selectionState === NodeSelectionState.SELECTED
    if (block.rightAttachedChildSet === null) {
      return null
    }
    const childSetBlock = block.renderedChildSets[block.rightAttachedChildSet]
    if (childSetBlock.componentType === LayoutComponentType.CHILD_SET_ATTACH_RIGHT) {
      return (
        <AttachedChildRightExpressionView
          block={childSetBlock}
          isSelected={isSelected}
          selection={selection}
        ></AttachedChildRightExpressionView>
      )
    }
    return null
  }
}
