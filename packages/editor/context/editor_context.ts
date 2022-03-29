import React from 'react'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from './selection'
import { SplootDataSheet } from '@splootcode/core/language/types/dataset/datasheet'
import { ValidationWatcher } from '@splootcode/core/language/validation/validation_watcher'
import { action, observable } from 'mobx'

export class EditorState {
  @observable
  rootNode: NodeBlock
  selection: NodeSelection
  validationWatcher: ValidationWatcher

  constructor() {
    this.rootNode = null
    this.selection = new NodeSelection()
    this.validationWatcher = new ValidationWatcher()
    this.validationWatcher.registerSelf()
  }

  @action
  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode
    this.selection.setRootNode(rootNode)
  }

  cleanup() {
    // Must be called before loading a new EditorState
    this.validationWatcher.deregisterSelf()
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
