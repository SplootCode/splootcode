import React from 'react'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from './selection'
import { Project } from '@splootcode/core/language/projects/project'
import { PythonAnalyzer } from '@splootcode/language-python/analyzer/python_analyzer'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootPackage } from '@splootcode/core/language/projects/package'
import { ValidationWatcher } from '@splootcode/core/language/validation/validation_watcher'
import { action, observable } from 'mobx'
import { generateScope } from '@splootcode/language-python/scope/scope'

export class EditorState {
  project: Project

  @observable
  rootNode: NodeBlock
  selection: NodeSelection
  validationWatcher: ValidationWatcher
  analyser: PythonAnalyzer

  constructor(project: Project) {
    this.project = project
    this.rootNode = null
    this.selection = new NodeSelection()
    this.validationWatcher = new ValidationWatcher()
    this.validationWatcher.registerSelf()
    this.analyser = new PythonAnalyzer(project)
    this.analyser.registerSelf()
  }

  async loadDefaultFile() {
    const pack = this.project.getDefaultPackage()
    const file = pack.getDefaultFile()
    return this.openFile(pack, file)
  }

  async openFile(pack: SplootPackage, file: SplootFile) {
    const loadedFile = await pack.getLoadedFile(file.name)
    // Build scope
    await generateScope(loadedFile.rootNode, this.analyser)

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
