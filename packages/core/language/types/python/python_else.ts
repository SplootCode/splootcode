import { ChildSetType } from '../../childset'
import { ElseStatementData, StatementCapture } from '../../capture/runtime_capture'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { PythonStatement } from './python_statement'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_ELSE_STATEMENT = 'PYTHON_ELSE_STATEMENT'

class ElseGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonElseBlock(null)
    const suggestion = new SuggestedNode(node, `else`, `else`, true, 'Else block')
    return [suggestion]
  }
}

export class PythonElseBlock extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ELSE_STATEMENT)
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getBlock().addChild(new PythonStatement(null))
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
    registerNodeCateogry(PYTHON_ELSE_STATEMENT, NodeCategory.PythonElseBlock)

    registerAutocompleter(NodeCategory.PythonElseBlock, new ElseGenerator())
  }
}
