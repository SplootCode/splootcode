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

  treeID: number
}

export interface ExpressionTypeRequest {
  treeID: number
  requestID: string

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
  treeID: number
  requestID: string

  type: ExpressionTypeInfo
}

export interface ParseTreeCommunicator {
  // messages
  sendParseTree(parseTreeInfo: ParseTreeInfo): void
  requestExpressionTypeInfo(req: ExpressionTypeRequest): void

  // initialisation
  setSendParseTreeHandler(handler: () => void): void
  setRequestExpressionTypeInfoHandler(handler: (type: ExpressionTypeResponse) => void): void
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

    this.sender.setRequestExpressionTypeInfoHandler(this.requestExpressionTypeInfoHandler.bind(this))

    this.sender.setSendParseTreeHandler(() => {
      this.files.forEach((file, path) => {
        this.updateParse(path)
      })
    })
  }

  async loadFile(path: string, rootNode: PythonFile) {
    this.files.set(path, rootNode)
    this.updateParse(path)
  }

  requestExpressionTypeInfoHandler(resp: ExpressionTypeResponse) {
    if (resp.requestID !== this.promiseID) {
      console.warn('Received stale promise response')

      return
    }

    if (this.promiseResolver) {
      this.promiseResolver(resp.type)
    }
  }

  promise: Promise<ExpressionTypeInfo> = null
  promiseID: string = null
  promiseResolver: (type: ExpressionTypeInfo) => void = null
  promiseRejecter: (reason: string) => void = null

  async getPyrightTypeForExpressionWorker(path: string, node: SplootNode): Promise<ExpressionTypeInfo> {
    const nodes = this.lookupNodeMaps.get(path).nodeMap
    const exprNode = nodes.get(node) as ExpressionNode

    if (!exprNode) {
      console.warn('Could not find SplootNode in nodeMap. Parse is probably ongoing.')

      return null
    }

    if (this.promise) {
      this.promiseRejecter('Promise has become stale')
    }

    const myPromiseID = Math.random().toFixed(10).toString()

    this.promiseID = myPromiseID
    this.promise = new Promise<ExpressionTypeInfo>((resolve, reject) => {
      this.sender.requestExpressionTypeInfo({
        treeID: this.currentAtomicID,
        requestID: this.promiseID,
        expression: exprNode,
      })

      this.promiseResolver = (type: ExpressionTypeInfo) => {
        resolve(type)

        this.promise = null
        this.promiseID = null
      }

      this.promiseRejecter = (reason: string) => {
        this.promise = null
        this.promiseID = null
        this.promiseResolver = null

        reject(reason)
      }

      setTimeout(() => {
        if (this.promiseID === myPromiseID) {
          console.warn('Pyright request timed out')

          this.promiseRejecter('Pyright request timed out')
        }
      }, 1000)
    })

    return this.promise
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

    const nodeMap = this.nodeMaps.get(path).nodeMap
    const exprNode = nodeMap.get(callNode) as CallNode
    if (exprNode) {
      const sig = this.program.evaluator.getCallSignatureInfo(exprNode, activeIndex, true)
      return sig
    }
    return null
  }

  updateParse(path: string) {
    this.dirtyPaths.add(path)
    this.latestParseID = Math.random()
    this.currentAtomicID += 1
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

    const paths = this.dirtyPaths
    this.dirtyPaths = new Set()
    this.currentParseID = this.latestParseID

    for (const path of paths) {
      const pathForFile = '/' + path
      const rootNode = this.files.get(path)

      {
        const parseMapper = new ParseMapper()
        const moduleNode = rootNode.generateParseTree(parseMapper)
        this.sender.sendParseTree({
          path: pathForFile,
          parseTree: moduleNode,
          modules: parseMapper.modules,
          treeID: this.currentAtomicID,
        })
        this.lookupNodeMaps.set(path, parseMapper)
      }

      {
        // TODO(harrison): strip out these main thread calls to pyright
        const parseMapper = new ParseMapper()
        const moduleNode = rootNode.generateParseTree(parseMapper)

        this.program.updateStructuredFile(pathForFile, moduleNode, parseMapper.modules)
        await this.program.parseRecursively(pathForFile)
        this.program.getBoundSourceFile(pathForFile)
        this.nodeMaps.set(path, parseMapper)
      }
    }

    if (this.latestParseID !== this.currentParseID) {
      this.currentParseID = null
      this.runParse()
    } else {
      this.currentParseID = null
    }
  }
}
