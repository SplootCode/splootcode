import { ChildSetType } from '../../childset'
import { ElseIfStatementData, SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeAnnotation, NodeAnnotationType, getSideEffectAnnotations } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { PYTHON_IF_STATEMENT, PythonIfStatement } from './python_if'
import { PYTHON_STATEMENT, PythonStatement } from './python_statement'
import { ParentReference, SplootNode } from '../../node'
import { PythonExpression } from './python_expression'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_ELIF_STATEMENT = 'PYTHON_ELIF_STATEMENT'

class InsertElifGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const node = new PythonElifBlock(null)
    return [new SuggestedNode(node, `elif`, `else elif`, true, 'Else-if block')]
  }
}

class AppendElifGenerator implements SuggestionGenerator {
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
          const node = new PythonElifBlock(null)
          const suggestion = new SuggestedNode(node, `elif`, `else elif`, true, 'Else-if block')
          suggestion.setOverrideLocation(ifNode.getElseBlocks(), ifNode.getElseBlocks().getCount())
          return [suggestion]
        }
      }
    }
    return []
  }
}

export class PythonElifBlock extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_ELIF_STATEMENT)
    this.addChildSet('condition', ChildSetType.Immutable, NodeCategory.PythonExpression)
    this.getChildSet('condition').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement)
  }

  getCondition() {
    return this.getChildSet('condition')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  validateSelf(): void {
    ;(this.getCondition().getChild(0) as PythonExpression).requireNonEmpty('If condition is required')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    const data = capture.data as ElseIfStatementData
    const condition = data.condition[0]
    const conditionData = condition.data as SingleStatementData

    const annotations: NodeAnnotation[] = getSideEffectAnnotations(condition)
    annotations.push({
      type: NodeAnnotationType.ReturnValue,
      value: {
        type: conditionData.resultType,
        value: conditionData.result,
      },
    })
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotations
    this.fireMutation(mutation)

    const blockChildren = this.getBlock().children
    let i = 0
    if (data.block) {
      const blockData = data.block
      for (; i < blockData.length; i++) {
        blockChildren[i].recursivelyApplyRuntimeCapture(blockData[i])
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
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
    const blockChildren = this.getBlock().children
    for (let i = 0; i < blockChildren.length; i++) {
      blockChildren[i].recursivelyClearRuntimeCapture()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonElifBlock {
    const node = new PythonElifBlock(null)
    node.getCondition().removeChild(0)
    node.deserializeChildSet('condition', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_ELIF_STATEMENT
    typeRegistration.deserializer = PythonElifBlock.deserializer
    typeRegistration.childSets = {
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'else if'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'condition'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_ELIF_STATEMENT, NodeCategory.PythonElseBlock)
    registerAutocompleter(NodeCategory.PythonElseBlock, new InsertElifGenerator())
    registerAutocompleter(NodeCategory.PythonStatementContents, new AppendElifGenerator())
  }
}
