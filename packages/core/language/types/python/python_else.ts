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
import { PYTHON_STATEMENT, PythonStatement } from './python_statement'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_ELSE_STATEMENT = 'PYTHON_ELSE_STATEMENT'

class AppendGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // TODO: This logic could be much cleaner if we had a way of hooking a
    // an autocompleter into the right place (i.e. overlappting cursors)
    if (parent.node.type === PYTHON_STATEMENT && parent.node.parent) {
      const parentStatement = parent.node as PythonStatement
      parent = parent.node.parent
      index = parentStatement.parent.getChildSet().getIndexOf(parentStatement)
    }
    const leftChild = parent.getChildSet().getChild(index - 1)
    if (leftChild && leftChild.type === PYTHON_STATEMENT) {
      const leftStatement = leftChild as PythonStatement
      const statementContents = leftStatement.getStatement().getChild(0)
      if (statementContents && statementContents.type === PYTHON_IF_STATEMENT) {
        const ifNode = statementContents as PythonIfStatement
        if (ifNode.allowAppendElse()) {
          const node = new PythonElseBlock(null)
          const suggestion = new SuggestedNode(node, `else`, `else`, true, 'Else block')
          suggestion.setOverrideLocation(ifNode.getElseBlocks(), ifNode.getElseBlocks().getCount())
          return [suggestion]
        }
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
