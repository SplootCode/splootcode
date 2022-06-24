import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { ModuleNode, ParseNodeType } from 'structured-pyright'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core/language/node_category_registry'
import { ParentReference } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonFileData, StatementCapture } from '@splootcode/core/language/capture/runtime_capture'
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
