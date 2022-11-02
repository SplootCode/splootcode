import React from 'react'

import { EditorNodeBlock } from './node_block'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelectionState } from '../context/selection'
import { RenderedFragment } from '../layout/rendered_fragment'

interface FragmentViewProps {
  fragment: RenderedFragment
}

export class FragmentView extends React.Component<FragmentViewProps> {
  render() {
    const fragment = this.props.fragment

    return (
      <g transform={`translate(${fragment.translateX}, ${fragment.translateY})`}>
        {fragment.nodes.map((nodeBlock: NodeBlock, idx: number) => {
          return (
            <React.Fragment key={idx}>
              <EditorNodeBlock block={nodeBlock} selectionState={NodeSelectionState.UNSELECTED} />
            </React.Fragment>
          )
        })}
      </g>
    )
  }
}
