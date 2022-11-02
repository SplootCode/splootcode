import {
  CallNode,
  CallSignatureInfo,
  ExpressionNode,
  ModuleImport,
  ParseNode,
  StructuredEditorProgram,
  Type,
  createStructuredProgram,
} from 'structured-pyright'
import {
  ChildSetMutation,
  ChildSetObserver,
  NodeMutation,
  NodeMutationType,
  NodeObserver,
  Project,
  SplootFile,
  SplootNode,
  SplootPackage,
  globalMutationDispatcher,
} from '@splootcode/core'
import { PythonFile } from '../nodes/python_file'

export class ParseMapper {
  nodeMap: Map<SplootNode, ParseNode>
  id: number
  modules: ModuleImport[]

  constructor() {
    this.nodeMap = new Map<SplootNode, ParseNode>()
    this.id = 1
    this.modules = []
  }

  addNode(splootNode: SplootNode, parseNode: ParseNode) {
    this.nodeMap.set(splootNode, parseNode)
  }

  getNextId() {
    return this.id++
  }

  addModuleImport(moduleImport: ModuleImport) {
    this.modules.push(moduleImport)
  }
}

export class PythonAnalyzer implements NodeObserver, ChildSetObserver {
  project: Project
  rootNode: PythonFile
  program: StructuredEditorProgram
  nodeMap: Map<SplootNode, ParseNode>
  currentParseID: number
  latestParseID: number

  constructor(project: Project) {
    this.project = project
    this.rootNode = null
    this.program = null
    this.nodeMap = new Map()
    this.currentParseID = null
    this.latestParseID = null
  }

  initialise(typeshedPath: string) {
    try {
      this.program = createStructuredProgram(typeshedPath)
    } catch (e) {
      console.warn('Failed to initialize Pyright program')
      console.warn(e)
    }
  }

  async loadFile(pack: SplootPackage, file: SplootFile) {
    const loadedFile = pack.getLoadedFile(file.name)
    this.rootNode = (await loadedFile).rootNode as PythonFile
    this.updateParse()
  }

  getPyrightTypeForExpression(node: SplootNode): Type {
    if (!this.program) {
      return null
    }
    const exprNode = this.nodeMap.get(node)
    if (exprNode) {
      const typeResult = this.program.evaluator.getTypeOfExpression(exprNode as ExpressionNode)
      return typeResult.type
    }
    return null
  }

  getPyrightFunctionSignature(callNode: SplootNode, activeIndex: number): CallSignatureInfo {
    if (!this.program) {
      return null
    }

    const exprNode = this.nodeMap.get(callNode) as CallNode
    if (exprNode) {
      const sig = this.program.evaluator.getCallSignatureInfo(exprNode, activeIndex, true)
      return sig
    }
    return null
  }

  registerSelf() {
    globalMutationDispatcher.registerNodeObserver(this)
    globalMutationDispatcher.registerChildSetObserver(this)
  }

  deregisterSelf() {
    globalMutationDispatcher.deregisterNodeObserver(this)
    globalMutationDispatcher.deregisterChildSetObserver(this)
  }

  updateParse() {
    this.latestParseID = Math.random()
    this.runParse()
  }

  async runParse() {
    if (!this.program) {
      return
    }

    if (this.currentParseID) {
      // Parse already in progress - avoid concurrent parses
      return
    }
    this.currentParseID = this.latestParseID

    const mainPath = '/main.py'
    const parseMapper = new ParseMapper()
    const moduleNode = this.rootNode.generateParseTree(parseMapper)
    this.program.updateStructuredFile(mainPath, moduleNode, parseMapper.modules)
    await this.program.parseRecursively(mainPath)
    this.program.getBoundSourceFile(mainPath)
    this.nodeMap = parseMapper.nodeMap

    if (this.latestParseID !== this.currentParseID) {
      this.currentParseID = null
      this.runParse()
    } else {
      this.currentParseID = null
    }
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    // Don't update on validation mutations or runtime annotations.
    if (nodeMutation.type == NodeMutationType.SET_PROPERTY) {
      this.updateParse()
    }
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    this.updateParse()
  }
}
