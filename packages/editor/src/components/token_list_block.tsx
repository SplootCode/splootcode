import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NODE_BLOCK_HEIGHT } from '../layout/layout_constants'
import { NodeBlock } from '../layout/rendered_node'
import { PlaceholderLabel } from './placeholder_label'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface TokenListBlockViewProps {
  block: RenderedChildSetBlock
  isSelected: boolean
  isValid: boolean
  invalidIndex: number
  isInline: boolean
}

@observer
export class TokenListBlockView extends React.Component<TokenListBlockViewProps> {
  render() {
    const { block, isValid, isInline, invalidIndex } = this.props
    let shape = null
    const childsetInvalid = !isValid && invalidIndex === undefined

    const classname = 'svgsplootnode gap' + (childsetInvalid ? ' invalid' : ' ')
    if (isInline || childsetInvalid) {
      shape = (
        <rect className={classname} x={block.x} y={block.y} height={NODE_BLOCK_HEIGHT} width={block.width} rx="4" />
      )
    }

    const label =
      block.nodes.length === 0 && block.labels.length > 0 ? (
        <PlaceholderLabel x={block.x} y={block.y} label={block.labels[0]} />
      ) : undefined

    return (
      <React.Fragment>
        {shape}
        {label}
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          const invalidChild = idx === invalidIndex
          const label = block.labels.length > idx ? block.labels[idx] : undefined
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock
                block={nodeBlock}
                selectionState={selectionState}
                isInvalidBlamed={invalidChild}
                placeholder={label}
              />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
