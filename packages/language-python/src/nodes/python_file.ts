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
import { ModuleNode, ParseNodeType } from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonFunctionDeclaration } from './python_function'
import { PythonIdentifier } from './python_identifier'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'

export const PYTHON_FILE = 'PYTHON_FILE'

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

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    const data = capture.data as PythonFileData
    this.getBody().recursivelyApplyRuntimeCapture(data.body)
    return true
  }

  makeHandler(name: string): void {
    const stmt = new PythonStatement(new ParentReference(this, 'body'))
    const func = new PythonFunctionDeclaration(new ParentReference(stmt, 'statement'))

    func.getIdentifier().addChild(new PythonIdentifier(new ParentReference(func, 'identifier'), name))
    func.getParams().addChild(new PythonIdentifier(new ParentReference(func, 'params'), 'event'))
    func.getParams().addChild(new PythonIdentifier(new ParentReference(func, 'params'), 'context'))

    stmt.getStatement().addChild(func)
    this.getBody().addChild(stmt)
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
