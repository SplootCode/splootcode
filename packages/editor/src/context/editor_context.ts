import React from 'react'
import { EditorHostingConfig } from '../editor_hosting_config'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from './selection'
import { Project, SplootFile, SplootPackage, ValidationWatcher } from '@splootcode/core'
import { PythonAnalyzer, generatePythonScope, isPythonNode } from '@splootcode/language-python'
import { action, observable } from 'mobx'

export class EditorState {
  project: Project

  @observable
  rootNode: NodeBlock
  selection: NodeSelection
  validationWatcher: ValidationWatcher
  analyser: PythonAnalyzer
  hostingConfig: EditorHostingConfig

  constructor(project: Project, hostingConfig: EditorHostingConfig) {
    this.project = project
    this.rootNode = null
    this.selection = new NodeSelection()
    this.validationWatcher = new ValidationWatcher()
    this.validationWatcher.registerSelf()
    this.analyser = new PythonAnalyzer(project)
    this.analyser.registerSelf()
    this.analyser.initialise(hostingConfig.TYPESHED_PATH)
    this.hostingConfig = hostingConfig
  }

  async loadDefaultFile() {
    const pack = this.project.getDefaultPackage()
    const file = pack.getDefaultFile()
    return this.openFile(pack, file)
  }

  async openFile(pack: SplootPackage, file: SplootFile) {
    const fileLoader = this.project.fileLoader
    const loadedFile = await pack.getLoadedFile(fileLoader, file.name)

    // Build scope
    if (isPythonNode(loadedFile.rootNode)) {
      await generatePythonScope(loadedFile.rootNode, this.analyser)
    }

    // Start up the analyzer
    // We don't technically need to wait for it, but it helps give time for
    // fonts to load correctly before render calculations happen.
    await this.analyser.loadFile(pack, file)

    // Prep NodeBlocks for rendering
    const newRootNode = new NodeBlock(null, loadedFile.rootNode, this.selection, 0)

    // Hook up root node into selection manager.
    // This will trigger calculating dimensions and building the cursor map.
    this.setRootNode(newRootNode)

    // Enable mutation firing
    loadedFile.rootNode.recursivelySetMutations(true)
    // Validate all nodes, firing validation mutations when invalid.
    loadedFile.rootNode.recursivelyValidate()
  }

  @action
  setRootNode(rootNode: NodeBlock) {
    this.rootNode = rootNode
    this.selection.setRootNode(rootNode)
  }

  cleanup() {
    // Must be called before loading a new EditorState
    this.validationWatcher.deregisterSelf()
    this.analyser.deregisterSelf()
  }
}

export const EditorStateContext = React.createContext(null)
