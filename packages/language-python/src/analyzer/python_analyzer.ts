import {
  CallNode,
  CallSignatureInfo,
  ExpressionNode,
  ModuleImport,
  ModuleNode,
  ParseNode,
  SimpleTypeResult,
  StructuredEditorProgram,
  Type,
  createStructuredProgram,
} from 'structured-pyright'
import { PythonFile } from '../nodes/python_file'
import { SplootNode } from '@splootcode/core'

export interface ParseTreeCommunicator {
  // messages
  sendParseTree(path: string, parseTree: ModuleNode, modules: ModuleImport[]): void
  requestExpressionTypeInfo(expression: ExpressionNode): void

  // initialisation
  setSendParseTreeHandler(handler: () => void): void
  setRequestExpressionTypeInfoHandler(handler: (type: SimpleTypeResult) => void): void
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
  currentParseID: number
  latestParseID: number
  dirtyPaths: Set<string>
  sender: ParseTreeCommunicator

  constructor(sender: ParseTreeCommunicator) {
    this.program = null
    this.nodeMaps = new Map()
    this.files = new Map()
    this.currentParseID = null
    this.latestParseID = null
    this.dirtyPaths = new Set()
    this.sender = sender
  }

  initialise(typeshedPath: string) {
    console.log(typeshedPath)

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

  requestExpressionTypeInfoHandler(type: SimpleTypeResult) {
    if (this.promiseResolver) {
      this.promiseResolver(type)
    }
  }

  promise: Promise<SimpleTypeResult> = null
  promiseID: string = null
  promiseResolver: (type: SimpleTypeResult) => void = null

  async getPyrightTypeForExpressionWorker(path: string, node: SplootNode): Promise<SimpleTypeResult> {
    const nodes = this.nodeMaps.get(path).nodeMap
    const exprNode = nodes.get(node) as ExpressionNode

    if (this.promise) {
      console.warn('already fetching type')
      return null
    }

    const myPromiseID = Math.random().toFixed(10).toString()

    this.promiseID = myPromiseID
    this.promise = new Promise<SimpleTypeResult>((resolve, reject) => {
      this.sender.requestExpressionTypeInfo(exprNode)

      this.promiseResolver = (type: SimpleTypeResult) => {
        resolve(type)

        this.promise = null
        this.promiseID = null
      }

      setTimeout(() => {
        if (this.promiseID === myPromiseID) {
          console.warn('Pyright type request timed out')
          this.promise = null
          this.promiseID = null
          this.promiseResolver = null

          reject('Pyright type request timed out')
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
      const parseMapper = new ParseMapper()
      const rootNode = this.files.get(path)

      const moduleNode = rootNode.generateParseTree(parseMapper)

      this.sender.sendParseTree(pathForFile, moduleNode, parseMapper.modules)
      this.nodeMaps.set(path, parseMapper)

      // const clonedMapper = structuredClone(parseMapper)
      //
      // // TODO(harrison): strip out these main thread calls to pyright
      // this.program.updateStructuredFile(pathForFile, moduleNode, clonedMapper.modules)
      // await this.program.parseRecursively(pathForFile)
      // this.program.getBoundSourceFile(pathForFile)
    }

    if (this.latestParseID !== this.currentParseID) {
      this.currentParseID = null
      this.runParse()
    } else {
      this.currentParseID = null
    }
  }
}
