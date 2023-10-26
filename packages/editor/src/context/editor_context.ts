import React from 'react'
import { AutosaveWatcher } from './autosave_watcher'
import { EditorHostingConfig } from '../editor_hosting_config'
import { NodeBlock } from '../layout/rendered_node'
import { NodeSelection } from './selection'
import { Project, ProjectLoader, SplootFile, SplootPackage, ValidationWatcher, Tongue } from '@splootcode/core'
import { ProjectFileChangeWatcher } from '../runtime/project_file_change_watcher'
import { PythonAnalyzer, PythonFile, generatePythonScope, isPythonNode } from '@splootcode/language-python'
import { RuntimeContextManager } from './runtime_context_manager'
import { UndoWatcher } from './undoWatcher'
import { action, observable } from 'mobx'
import { awaitFontsLoaded } from '../layout/layout_constants'

export class EditorState {
  project: Project

  @observable
  rootNode: NodeBlock
  tongue: Tongue
  selection: NodeSelection
  validationWatcher: ValidationWatcher
  analyser: PythonAnalyzer
  hostingConfig: EditorHostingConfig
  featureFlags: Map<string, boolean>
  autosaveWatcher: AutosaveWatcher
  undoWatcher: UndoWatcher
  runtimeContextManager: RuntimeContextManager

  constructor(
    project: Project,
    hostingConfig: EditorHostingConfig,
    projectLoader: ProjectLoader,
    tongue: Tongue,
    featureFlags?: Map<string, boolean>
  ) {
    this.tongue = tongue
    this.project = project
    this.rootNode = null
    this.selection = new NodeSelection()
    this.validationWatcher = new ValidationWatcher()
    this.validationWatcher.registerSelf()
    this.hostingConfig = hostingConfig
    this.featureFlags = featureFlags || new Map()
    this.autosaveWatcher = new AutosaveWatcher(project, projectLoader)
    this.autosaveWatcher.registerSelf()

    this.undoWatcher = new UndoWatcher()
    this.undoWatcher.registerSelf()

    const fileChangeWatcher = new ProjectFileChangeWatcher(project, project.getDefaultPackage(), this.validationWatcher)
    this.runtimeContextManager = new RuntimeContextManager(project, fileChangeWatcher)
    this.runtimeContextManager.registerSelf()

    this.analyser = new PythonAnalyzer(this.runtimeContextManager)
    this.analyser.initialise(hostingConfig.TYPESHED_PATH)
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
      await generatePythonScope(file.name, loadedFile.rootNode, this.analyser, this.tongue)
    }

    // Start up the analyzer
    // We don't technically need to wait for it, but it helps give time for
    // fonts to load correctly before render calculations happen.
    const rootNode = loadedFile.rootNode as PythonFile
    await this.analyser.loadFile(file.name, rootNode)
    this.undoWatcher.setRootNode(rootNode)

    // Make sure font is loaded before rendering.
    await awaitFontsLoaded()
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
    this.runtimeContextManager.deregisterSelf()
    this.validationWatcher.deregisterSelf()
    this.autosaveWatcher.deregisterSelf()
    this.undoWatcher.deregisterSelf()
  }
}

export const EditorStateContext = React.createContext(null)
