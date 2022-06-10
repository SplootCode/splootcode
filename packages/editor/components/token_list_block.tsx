import './tree_list_block.css'

import React from 'react'
import { observer } from 'mobx-react'

import { EditorNodeBlock } from './node_block'
import { NODE_BLOCK_HEIGHT } from '../layout/layout_constants'
import { NodeBlock } from '../layout/rendered_node'
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
    return (
      <React.Fragment>
        {shape}
        {block.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          const selectionState = block.getChildSelectionState(idx)
          const invalidChild = idx === invalidIndex
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selectionState={selectionState} isInvalidBlamed={invalidChild} />
            </React.Fragment>
          )
        })}
      </React.Fragment>
    )
  }
}
