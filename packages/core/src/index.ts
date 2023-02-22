// Nodes
export { SplootNode, ParentReference } from './language/node'
export { SplootFragment, deserializeFragment } from './language/fragment'
export {
  registerFragmentAdapter,
  registerLastResortFragmentAdapater,
  adaptFragmentToPasteDestinationIfPossible,
  combineFragments,
} from './language/fragment_adapter'
export {
  TypeRegistration,
  deserializeNode,
  adaptNodeToPasteDestination,
  NodeLayout,
  LayoutComponent,
  LayoutComponentType,
  DeserializationError,
  NodeBoxType,
  PasteNodeAdapter,
  getPasteNodeAdaptersForType,
  isAdaptableToPasteDesintation,
  registerType,
  resolvePasteAdapters,
  SerializedNode,
  isScopedNodeType,
} from './language/type_registry'
export { ChildSet, ChildSetType } from './language/childset'

// Autocomplete & Registry
export { SuggestedNode } from './language/autocomplete/suggested_node'
export {
  NodeCategory,
  registerNodeCateogry,
  SuggestionGenerator,
  getAutocompleteRegistry,
  registerAutocompleter,
  registerAutocompleteAdapter,
  registerBlankFillForNodeCategory,
  getNodeCategoriesForType,
  getNodesForCategory,
  getBlankFillForCategory,
  isNodeInCategory,
  getLayoutComponentForCategory,
} from './language/node_category_registry'
export { Autocompleter } from './language/autocomplete/autocompleter'

// Mutations and observers
export { NodeObserver, ChildSetObserver, ScopeObserver, ProjectObserver } from './language/observers'
export { NodeMutation, NodeMutationType } from './language/mutations/node_mutations'
export { ChildSetMutation, ChildSetMutationType } from './language/mutations/child_set_mutations'
export { ProjectMutation, ProjectMutationType } from './language/mutations/project_mutations'
export { ScopeMutation, ScopeMutationType, RenameScopeMutation } from './language/mutations/scope_mutations'
export { globalMutationDispatcher } from './language/mutations/mutation_dispatcher'
export { ValidationWatcher } from './language/validation/validation_watcher'

// Annotations
export {
  NodeAnnotation,
  NodeAnnotationType,
  getSideEffectAnnotations,
  AssignmentAnnotation,
  ParseErrorAnnotation,
  ReturnValueAnnotation,
  RuntimeErrorAnnotation,
  SideEffectAnnotation,
  LoopAnnotation,
} from './language/annotations/annotations'
// TODO: Move these to language-python
export {
  CapturePayload,
  ElseIfStatementData,
  ElseStatementData,
  ForLoopData,
  ForLoopIteration,
  FunctionCallData,
  FunctionDeclarationData,
  IfStatementData,
  ImportStatementData,
  PythonFileData,
  SingleStatementData,
  StatementCapture,
  WhileLoopData,
  WhileLoopIteration,
} from './language/capture/runtime_capture'

// Project stuff
export { Project, SerializedProject } from './language/projects/project'
export { RunSettings, RunType } from './language/projects/run_settings'
export { ProjectLoader, ProjectMetadata, FileLoader, SaveError } from './language/projects/file_loader'
export { SplootPackage, PackageBuildType } from './language/projects/package'
export { SplootFile } from './language/projects/file'

// Tray stuff
export { TrayCategory, TrayEntry, TrayExample, TrayListing } from './language/tray/tray'

// TODO: move these specific storage approaches to different package
export { LocalStorageProjectLoader } from './code_io/local_storage_project_loader'
export { loadProjectFromFolder, exportProjectToFolder } from './code_io/filesystem'
export { StaticFileLoader } from './code_io/static_file_loader'

// Colors
// TODO: Move colours to language-specific packages.
export { HighlightColorCategory, ColorUsageType, getColor } from './colors'
