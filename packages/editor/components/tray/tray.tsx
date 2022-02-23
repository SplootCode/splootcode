import './tray.css'

import React from 'react'
import { observer } from 'mobx-react'

import { Category } from './category'
import { NodeBlock } from '../../layout/rendered_node'
import { PYTHON_FILE } from '@splootcode/core/language/types/python/python_file'
import { PythonLanguageTray } from '@splootcode/core/language/tray/python/language'
import { ScopeTray } from './scope_tray'
import { SplootNode } from '@splootcode/core/language/node'
import { TrayCategory } from '@splootcode/core/language/tray/tray'

interface TrayProps {
  rootNode: SplootNode
  width: number
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

interface TrayState {
  listing: TrayCategory
}

function getTrayListing(rootNode: SplootNode): TrayCategory {
  if (rootNode.type === PYTHON_FILE) {
    return PythonLanguageTray
  }
  return {
    category: '',
    entries: [],
  }
}

@observer
export class Tray extends React.Component<TrayProps, TrayState> {
  constructor(props) {
    super(props)
    this.state = {
      listing: getTrayListing(props.rootNode),
    }
  }

  render() {
    const { rootNode, startDrag } = this.props
    return (
      <div className="tray">
        <ScopeTray rootNode={rootNode} startDrag={startDrag} />
        <Category category={this.state.listing} startDrag={startDrag} />
      </div>
    )
  }
}
