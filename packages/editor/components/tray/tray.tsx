import './tray.css'

import React from 'react'

import { Category } from './category'
import { NodeBlock } from '../../layout/rendered_node'
import { PYTHON_FILE } from '@splootcode/core/language/types/python/python_file'
import { PythonLanguageTray } from '@splootcode/core/language/tray/python/language'
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

export class Tray extends React.Component<TrayProps, TrayState> {
  constructor(props) {
    super(props)
    this.state = {
      listing: getTrayListing(props.rootNode),
    }
  }

  render() {
    return (
      <div className="tray">
        <Category category={this.state.listing} startDrag={this.props.startDrag} />
      </div>
    )
  }
}
