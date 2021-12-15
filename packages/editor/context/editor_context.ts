import React from 'react'
import { NodeSelection } from './selection'
import { NodeBlock } from '../layout/rendered_node'
import { observable, action } from 'mobx'
import { SplootDataSheet } from '@splootcode/core/language/types/dataset/datasheet'

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
