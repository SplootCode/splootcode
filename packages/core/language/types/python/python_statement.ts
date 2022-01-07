import { ChildSetType } from '../../childset'
import {
  EmptySuggestionGenerator,
  NodeCategory,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
} from '../../node_category_registry'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { StatementCapture } from '../../capture/runtime_capture'

export const PYTHON_STATEMENT = 'PYTHON_STATEMENT'

export class PythonStatement extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_STATEMENT)
    this.addChildSet('statement', ChildSetType.Single, NodeCategory.PythonStatementContents)
  }

  getStatement() {
    return this.getChildSet('statement')
  }

  clean() {
    if (this.getStatement().getCount() !== 0) {
      const statement = this.getStatement().getChild(0)
      if (statement.type === PYTHON_EXPRESSION && (statement as PythonExpression).getTokenSet().getCount() === 0) {
        this.getStatement().removeChild(0)
      }
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonStatement {
    const res = new PythonStatement(null)
    res.deserializeChildSet('statement', serializedNode)
    return res
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    // TODO: Pass statement capture to child
    return
  }

  recursivelyClearRuntimeCapture() {
    if (this.getStatement().getCount() !== 0) {
      this.getStatement().getChild(0).recursivelyClearRuntimeCapture()
    }
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_STATEMENT
    typeRegistration.deserializer = PythonStatement.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = { statement: NodeCategory.PythonStatementContents }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.NONE,
      [new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'statement')],
      NodeBoxType.INVISIBLE
    )

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_STATEMENT, NodeCategory.PythonStatement, new EmptySuggestionGenerator())

    registerBlankFillForNodeCategory(NodeCategory.PythonStatement, () => {
      return new PythonStatement(null)
    })
  }
}
