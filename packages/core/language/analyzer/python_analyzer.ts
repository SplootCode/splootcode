import { ChildSetMutation } from '../mutations/child_set_mutations'
import { ChildSetObserver, NodeObserver } from '../observers'
import { ExpressionNode, ParseNode, SplootProgram, TypeResult, setupProgram } from 'sploot-checker'
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
}

export class PythonAnalyzer implements NodeObserver, ChildSetObserver {
  project: Project
  rootNode: PythonFile
  splootProgram: SplootProgram
  nodeMap: Map<SplootNode, ParseNode>

  constructor(project: Project) {
    this.project = project
    this.rootNode = null
    this.splootProgram = setupProgram(process.env.TYPESHED_PATH)
    this.nodeMap = new Map()
  }

  async loadFile(pack: SplootPackage, file: SplootFile) {
    const loadedFile = pack.getLoadedFile(file.name)
    this.rootNode = (await loadedFile).rootNode as PythonFile
    await this.updateParse()
  }

  getPyrightTypeForExpression(node: SplootNode): TypeResult {
    const exprNode = this.nodeMap.get(node)
    if (exprNode) {
      // TODO: Enforce that this node is actually an expression node
      return this.splootProgram.evaluator.getTypeOfExpression(exprNode as ExpressionNode)
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
    const mainPath = '/fake/main.py'
    const newNodeMap = new Map<SplootNode, ParseNode>()
    let id = 1
    const parseMapper: ParseMapper = {
      addNode: (splootNode: SplootNode, parseNode: ParseNode) => {
        newNodeMap.set(splootNode, parseNode)
      },
      getNextId: () => {
        return id++
      },
    }
    this.splootProgram.updateSplootFile(mainPath, this.rootNode.generateParseTree(parseMapper))
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
