import { ChildSetMutation } from '@splootcode/core/language/mutations/child_set_mutations'
import { ChildSetObserver, NodeObserver } from '@splootcode/core/language/observers'
import {
  ExpressionNode,
  ModuleImport,
  ParseNode,
  StructuredEditorProgram,
  Type,
  createStructuredProgram,
} from 'structured-pyright'
import { NodeMutation } from '@splootcode/core/language/mutations/node_mutations'
import { Project } from '@splootcode/core/language/projects/project'
import { PythonFile } from '../nodes/python_file'
import { SplootFile } from '@splootcode/core/language/projects/file'
import { SplootNode } from '@splootcode/core/language/node'
import { SplootPackage } from '@splootcode/core/language/projects/package'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

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

  constructor(project: Project) {
    this.project = project
    this.rootNode = null
    this.program = createStructuredProgram(process.env.TYPESHED_PATH)
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
      const typeResult = this.program.evaluator.getTypeOfExpression(exprNode as ExpressionNode)
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

    const parseMapper = new ParseMapper()
    const moduleNode = this.rootNode.generateParseTree(parseMapper)
    this.program.updateStructuredFile(mainPath, moduleNode, parseMapper.modules)
    await this.program.parseRecursively(mainPath)
    this.program.getBoundSourceFile(mainPath)
    this.nodeMap = parseMapper.nodeMap
  }

  handleNodeMutation(nodeMutation: NodeMutation): void {
    this.updateParse()
  }

  handleChildSetMutation(mutations: ChildSetMutation): void {
    this.updateParse()
  }
}
