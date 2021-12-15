import React from 'react'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from './selection'
import { SplootDataSheet } from '@splootcode/core/language/types/dataset/datasheet'
import { action, observable } from 'mobx'

export class EditorState {
  @observable
  rootNode: NodeBlock
  selection: NodeSelection

  constructor() {
    this.rootNode = null
    this.selection = new NodeSelection()
  }

  @action
  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode
    this.selection.setRootNode(rootNode)
  }
}

export class DataSheetState {
  @observable
  dataSheetNode: SplootDataSheet

  constructor() {
    this.dataSheetNode = null
  }

  @action
  setDataSheetNode(dataSheetNode: SplootDataSheet) {
    this.dataSheetNode = dataSheetNode
  }
}

export const DataSheetStateContext = React.createContext(null)

export const EditorStateContext = React.createContext(null)
