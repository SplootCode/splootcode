import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  PythonFileData,
  SerializedNode,
  StatementCapture,
  TypeRegistration,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { FunctionSignature, TypeCategory } from '../scope/types'
import { ModuleNode, ParseNodeType } from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonFunctionDeclaration } from './python_function'
import { PythonIdentifier } from './python_identifier'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'

export const PYTHON_FILE = 'PYTHON_FILE'

export interface PotentialHandlers {
  candidates: string[]
  newName?: string
}

const isFunctionHandlerSignature = (func: FunctionSignature, requiredArgs: string[]): boolean => {
  if (func.arguments.length !== requiredArgs.length) {
    return false
  }

  for (let i = 0; i < requiredArgs.length; i++) {
    if (func.arguments[i].name !== requiredArgs[i]) {
      return false
    }
  }
  return true
}

export class PythonFile extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FILE)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.PythonStatement)
  }

  getBody() {
    return this.getChildSet('body')
  }

  generateCodeString(): string {
    return 'print("Hello, World!")\n'
  }

  generateParseTree(parseMapper: ParseMapper): ModuleNode {
    const moduleNode: ModuleNode = {
      start: 0,
      length: 0,
      nodeType: ParseNodeType.Module,
      id: parseMapper.getNextId(),
      statements: [],
    }
    for (const node of this.getBody().children) {
      const statement = node as PythonStatement
      if (!statement.isEmpty()) {
        const statementNode = statement.generateParseTree(parseMapper)
        if (statementNode !== null) {
          moduleNode.statements.push(statementNode)
          statementNode.parent = moduleNode
        }
      }
    }
    return moduleNode
  }

  recursivelySetLineNumbers(startNumber: number): number {
    let lineNumber = startNumber
    for (const node of this.getBody().children) {
      lineNumber = node.recursivelySetLineNumbers(lineNumber)
    }
    return lineNumber
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      this.recursivelyClearRuntimeCapture()
      return false
    }
    const data = capture.data as PythonFileData
    this.getBody().recursivelyApplyRuntimeCapture(data.body)
    return true
  }

  makeHandler(name: string, args: string[]): void {
    const stmt = new PythonStatement(null)
    const func = new PythonFunctionDeclaration(null)

    func.getIdentifier().addChild(new PythonIdentifier(null, name))
    for (const argName of args) {
      func.getParams().addChild(new PythonIdentifier(null, argName))
    }

    stmt.getStatement().addChild(func)
    this.getBody().addChild(stmt)
  }

  getPotentialHandlers(requiredArgs: string[]): PotentialHandlers {
    const scope = this.getScope()

    const candidates: string[] = []
    const seenNames = new Set<string>()

    for (const [name, entry] of scope.variables.entries()) {
      let funcSignature: FunctionSignature = null
      for (const metadata of entry.declarers.values()) {
        if (metadata.typeInfo?.category === TypeCategory.Function) {
          funcSignature = metadata.typeInfo
        }
      }

      seenNames.add(name)
      if (funcSignature) {
        if (isFunctionHandlerSignature(funcSignature, requiredArgs)) {
          candidates.push(name)
        }
      }
    }

    let newName = 'handler'
    let i = 1
    while (seenNames.has(newName)) {
      newName = `handler${i}`
      i++
    }

    return { candidates, newName }
  }

  static deserializer(serializedNode: SerializedNode): PythonFile {
    const node = new PythonFile(null)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_FILE
    typeRegistration.deserializer = PythonFile.deserializer
    typeRegistration.properties = []
    typeRegistration.hasScope = true
    typeRegistration.childSets = { body: NodeCategory.PythonStatement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body', [], { endCursor: true }),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_FILE, NodeCategory.PythonFile)
  }
}
