import {
  CallNode,
  CallSignatureInfo,
  ExpressionNode,
  ModuleImport,
  ModuleNode,
  ParseNode,
  StructuredEditorProgram,
  Type,
  TypeCategory,
  createStructuredProgram,
} from 'structured-pyright'
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
  expression: ExpressionNode
}

// TODO(harrison): pyright's Type interface is not serializable, so we have to do this. In the future this interface should be replaced
// with a generic 'autocomplete response' interface.
export interface ExpressionTypeInfo {
  category: TypeCategory
  name?: string
  subtypes?: ExpressionTypeInfo[]
}

export interface ExpressionTypeResponse {
  parseID: number
  requestID: string

  type: ExpressionTypeInfo
}

export interface ParseTrees {
  parseTrees: ParseTreeInfo[]
  parseID: number
}

export interface ParseTreeCommunicator {
  // initialisation
  setGetParseTreesCallback(callback: (filePaths: Set<string>) => ParseTrees): void

  // messages
  getPyrightTypeForExpression(path: string, node: ExpressionNode, parseID: number): Promise<ExpressionTypeInfo>
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
    for (const path of filePaths) {
      this.dirtyPaths.add(path)
    }
    this.latestParseID = Math.random()
    this.runParse()

    return { parseTrees, parseID: this.currentAtomicID }
  }

  async loadFile(path: string, rootNode: PythonFile) {
    this.files.set(path, rootNode)
  }

  async getPyrightTypeForExpressionWorker(path: string, node: SplootNode): Promise<ExpressionTypeInfo> {
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

    return this.sender.getPyrightTypeForExpression(path, exprNode, this.currentAtomicID)
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

    for (const path of paths) {
      const pathForFile = '/' + path
      const rootNode = this.files.get(path)

      const parseMapper = new ParseMapper()
      const moduleNode = rootNode.generateParseTree(parseMapper)

      this.program.updateStructuredFile(pathForFile, moduleNode, parseMapper.modules)
      await this.program.parseRecursively(pathForFile)
      this.program.getBoundSourceFile(pathForFile)
      this.nodeMaps.set(path, parseMapper)
    }

    if (this.latestParseID !== this.currentParseID) {
      this.currentParseID = null
      this.runParse()
    } else {
      this.currentParseID = null
    }
  }
}
