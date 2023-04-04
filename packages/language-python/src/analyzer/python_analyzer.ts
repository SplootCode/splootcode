import {
  CallNode,
  CallSignatureInfo,
  ExpressionNode,
  ModuleImport,
  ModuleNode,
  ParseNode,
  StructuredEditorProgram,
  Type,
  createStructuredProgram,
} from 'structured-pyright'
import { FunctionArgType } from '../scope/types'
import { PythonFile } from '../nodes/python_file'
import { SplootNode } from '@splootcode/core'

export interface ParseTreeInfo {
  path: string
  parseTree: ModuleNode
  modules: ModuleImport[]
}

export interface ExpressionTypeRequest {
  parseID: number
  requestID: string

  path: string
  expressionID: number
}

export const enum AutocompleteEntryCategory {
  Value = 0,
  Function,
}

export interface AutocompleteEntryVariable {
  category: AutocompleteEntryCategory.Value
  name: string
  typeIfAttr?: string
  shortDoc?: string
  declarationNum: number
}

export interface AutocompleteEntryFunctionArgument {
  name: string
  type: FunctionArgType
  hasDefault: boolean
}

export interface AutocompleteEntryFunction {
  category: AutocompleteEntryCategory.Function
  name: string
  typeIfMethod?: string
  declarationNum: number
  shortDoc?: string

  arguments: AutocompleteEntryFunctionArgument[]
}

export type AutocompleteInfo = AutocompleteEntryVariable | AutocompleteEntryFunction

export interface ExpressionTypeResponse {
  parseID: number
  requestID: string

  autocompleteSuggestions: AutocompleteInfo[]
}

export interface ParseTrees {
  parseTrees: ParseTreeInfo[]
  parseID: number
}

export interface ParseTreeCommunicator {
  // initialisation
  setGetParseTreesCallback(callback: (filePaths: Set<string>) => ParseTrees): void

  // messages
  getExpressionType(path: string, nodeId: number, parseID: number): Promise<ExpressionTypeResponse>
}

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

export class PythonAnalyzer {
  files: Map<string, PythonFile>
  program: StructuredEditorProgram
  nodeMaps: Map<string, ParseMapper>
  lookupNodeMaps: Map<string, ParseMapper>
  currentParseID: number
  latestParseID: number
  dirtyPaths: Set<string>
  sender: ParseTreeCommunicator

  currentAtomicID: number

  constructor(sender: ParseTreeCommunicator) {
    this.program = null
    this.nodeMaps = new Map()
    this.lookupNodeMaps = new Map()
    this.files = new Map()
    this.currentParseID = null
    this.latestParseID = null
    this.dirtyPaths = new Set()
    this.sender = sender

    this.currentAtomicID = 0
  }

  initialise(typeshedPath: string) {
    try {
      this.program = createStructuredProgram(typeshedPath)
    } catch (e) {
      console.warn('Failed to initialize Pyright program')
      console.warn(e)
    }

    this.sender.setGetParseTreesCallback(this.getParseTrees)
  }

  getParseTrees = (filePaths: Set<string>) => {
    // Trigger new worker-based parse
    this.currentAtomicID += 1
    const parseTrees: ParseTreeInfo[] = []
    for (const path of filePaths) {
      parseTrees.push(this.getParseTreeForFile(path))
    }

    // Old style parse
    this.updateMainThreadParse(parseTrees)

    return { parseTrees, parseID: this.currentAtomicID }
  }

  async loadFile(path: string, rootNode: PythonFile) {
    this.files.set(path, rootNode)
  }

  async getExpressionType(path: string, node: SplootNode): Promise<ExpressionTypeResponse> {
    if (!this.lookupNodeMaps.has(path)) {
      console.warn('Could not find path in nodeMap. Parse is probably ongoing.')
      return null
    }

    const nodes = this.lookupNodeMaps.get(path).nodeMap
    const exprNode = nodes.get(node) as ExpressionNode

    if (!exprNode) {
      console.warn('Could not find SplootNode in nodeMap. Parse is probably ongoing.')

      return null
    }

    return this.sender.getExpressionType(path, exprNode.id, this.currentAtomicID)
  }

  getPyrightTypeForExpression(path: string, node: SplootNode): Type {
    if (!this.program) {
      return null
    }
    const nodeMap = this.nodeMaps.get(path).nodeMap
    const exprNode = nodeMap.get(node)
    if (exprNode) {
      const typeResult = this.program.evaluator.getTypeOfExpression(exprNode as ExpressionNode)
      return typeResult.type
    }
    return null
  }

  getPyrightFunctionSignature(path: string, callNode: SplootNode, activeIndex: number): CallSignatureInfo {
    if (!this.program) {
      return null
    }

    if (this.nodeMaps.has(path)) {
      const nodeMap = this.nodeMaps.get(path).nodeMap
      const exprNode = nodeMap.get(callNode) as CallNode
      if (exprNode) {
        const sig = this.program.evaluator.getCallSignatureInfo(exprNode, activeIndex, true)
        return sig
      }
    }
    return null
  }

  getParseTreeForFile(path: string): ParseTreeInfo {
    const pathForFile = '/' + path

    const rootNode = this.files.get(path)

    const parseMapper = new ParseMapper()
    const moduleNode = rootNode.generateParseTree(parseMapper)
    this.lookupNodeMaps.set(path, parseMapper)

    return {
      path: pathForFile,
      parseTree: moduleNode,
      modules: parseMapper.modules,
    }
  }

  async updateMainThreadParse(parseTreeInfos: ParseTreeInfo[]) {
    this.latestParseID = Math.random()

    for (const parseTreeInfo of parseTreeInfos) {
      this.program.updateStructuredFile(parseTreeInfo.path, parseTreeInfo.parseTree, parseTreeInfo.modules)
      this.dirtyPaths.add(parseTreeInfo.path.substring(1))
    }

    setTimeout(() => this.runParse(), 0)
  }

  // TODO(harrison): remove this function once we have all pyright stuff on the worker
  async runParse() {
    if (!this.program) {
      return
    }

    if (this.currentParseID) {
      // Parse already in progress - avoid concurrent parses
      return
    }

    const paths = this.dirtyPaths
    this.dirtyPaths = new Set()

    this.currentParseID = this.latestParseID
    const newNodeMaps = new Map()
    for (const path of paths) {
      const parseMapper = this.lookupNodeMaps.get(path)

      newNodeMaps.set(path, parseMapper)
    }
    for (const path of paths) {
      const pathForFile = '/' + path
      await this.program.parseRecursively(pathForFile)
      this.program.getBoundSourceFile(pathForFile)
    }
    this.nodeMaps = newNodeMaps

    if (this.latestParseID !== this.currentParseID) {
      this.currentParseID = null
      this.runParse()
    } else {
      this.currentParseID = null
    }
  }
}
