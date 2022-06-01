import { ChildSetMutation } from '../mutations/child_set_mutations'
import { ChildSetObserver, NodeObserver } from '../observers'
import {
  ExpressionNode,
  ModuleImport,
  ParseNode,
  StructuredEditorProgram,
  Type,
  createStructuredProgram,
} from 'structured-pyright'
import { NodeMutation } from '../mutations/node_mutations'
import { Project } from '../projects/project'
import { PythonFile } from '../types/python/python_file'
import { SplootFile } from '../projects/file'
import { SplootNode } from '../node'
import { SplootPackage } from '../projects/package'
import { globalMutationDispatcher } from '../mutations/mutation_dispatcher'

export interface ParseMapper {
  getNextId(): number
  addNode(splootNode: SplootNode, parseNode: ParseNode): void
  addModuleImport(moduleImport: ModuleImport): void
}

export class PythonAnalyzer implements NodeObserver, ChildSetObserver {
  project: Project
  rootNode: PythonFile
  splootProgram: StructuredEditorProgram
  nodeMap: Map<SplootNode, ParseNode>

  constructor(project: Project) {
    this.project = project
    this.rootNode = null
    this.splootProgram = createStructuredProgram(process.env.TYPESHED_PATH)
    this.nodeMap = new Map()
  }

  async loadFile(pack: SplootPackage, file: SplootFile) {
    const loadedFile = pack.getLoadedFile(file.name)
    this.rootNode = (await loadedFile).rootNode as PythonFile
    await this.updateParse()
  }

  getPyrightTypeForExpression(node: SplootNode): Type {
    const exprNode = this.nodeMap.get(node)
    if (exprNode) {
      const typeResult = this.splootProgram.evaluator.getTypeOfExpression(exprNode as ExpressionNode)
      return typeResult.type
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

  async updateParse() {
    const mainPath = '/main.py'
    const newNodeMap = new Map<SplootNode, ParseNode>()
    let id = 1
    const modules: ModuleImport[] = []
    const parseMapper: ParseMapper = {
      addNode: (splootNode: SplootNode, parseNode: ParseNode) => {
        newNodeMap.set(splootNode, parseNode)
      },
      getNextId: () => {
        return id++
      },
      addModuleImport: (moduleImport: ModuleImport) => {
        modules.push(moduleImport)
      },
    }
    const moduleNode = this.rootNode.generateParseTree(parseMapper)
    this.splootProgram.updateStructuredFile(mainPath, moduleNode, modules)
    await this.splootProgram.parseRecursively(mainPath)
    this.splootProgram.getBoundSourceFile(mainPath)
    this.nodeMap = newNodeMap
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    this.updateParse()
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    this.updateParse()
  }
}
