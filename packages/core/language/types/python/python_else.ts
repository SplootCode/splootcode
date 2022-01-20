import { ChildSetType } from '../../childset'
import { ElseStatementData, StatementCapture } from '../../capture/runtime_capture'
import {
  EmptySuggestionGenerator,
  NodeCategory,
  SuggestionGenerator,
  registerNodeCateogry,
} from '../../node_category_registry'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { PYTHON_IF_STATEMENT, PythonIfStatement } from './python_if'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_ELSE_STATEMENT = 'PYTHON_ELSE_STATEMENT'

class AppendGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (leftChild && leftChild.type === PYTHON_IF_STATEMENT) {
      const node = new PythonElseBlock(null)
      if ((leftChild as PythonIfStatement).allowAppendElse()) {
        return [new SuggestedNode(node, `else`, `else`, true, 'Else block', null, 'elseblocks')]
      }
    }
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class PythonElseBlock extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ELSE_STATEMENT)
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
  }

  getBlock() {
    return this.getChildSet('block')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    const data = capture.data as ElseStatementData
    const blockChildren = this.getBlock().children
    let i = 0
    if (data.block) {
      const trueBlockData = data.block
      for (; i < trueBlockData.length; i++) {
        blockChildren[i].recursivelyApplyRuntimeCapture(trueBlockData[i])
      }
    }
    if (i < blockChildren.length) {
      for (; i < blockChildren.length; i++) {
        blockChildren[i].recursivelyClearRuntimeCapture()
      }
    }
    return true
  }

  recursivelyClearRuntimeCapture() {
    const blockChildren = this.getBlock().children
    for (let i = 0; i < blockChildren.length; i++) {
      blockChildren[i].recursivelyClearRuntimeCapture()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonElseBlock {
    const node = new PythonElseBlock(null)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ELSE_STATEMENT
    typeRegistration.deserializer = PythonElseBlock.deserializer
    typeRegistration.childSets = {
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'else'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ELSE_STATEMENT, NodeCategory.PythonStatementContents, new AppendGenerator())
    registerNodeCateogry(PYTHON_ELSE_STATEMENT, NodeCategory.PythonElseBlock, new EmptySuggestionGenerator())
  }
}
