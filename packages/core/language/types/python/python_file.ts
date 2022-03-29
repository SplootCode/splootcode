import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { PythonFileData, StatementCapture } from '../../capture/runtime_capture'

export const PYTHON_FILE = 'PYTHON_FILE'

export class PythonFile extends SplootNode {
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body', { endCursor: true }),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_FILE, NodeCategory.PythonFile)
  }
}
