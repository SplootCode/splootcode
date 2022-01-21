import { ChildSetType } from '../../childset'
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
import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleteFunctionsForCategory,
  registerBlankFillForNodeCategory,
  registerNodeCateogry,
} from '../../node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '@splootcode/core/language/suggested_node'

export const PYTHON_STATEMENT = 'PYTHON_STATEMENT'

export class PythonStatementGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // Get all static expression tokens available and wrap them in an expression node.
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonStatementContents)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const allSuggestions = generator.staticSuggestions(parent, index).map((innerSuggestionNode: SuggestedNode) => {
        const statementNode = new PythonStatement(null)
        statementNode.getStatement().addChild(innerSuggestionNode.node)
        innerSuggestionNode.node = statementNode
        return innerSuggestionNode
      })
      staticSuggestions = staticSuggestions.concat(allSuggestions)
    })
    return staticSuggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonStatementContents)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const allSuggestions = generator
        .dynamicSuggestions(parent, index, textInput)
        .map((innerSuggestionNode: SuggestedNode) => {
          const statementNode = new PythonStatement(null)
          statementNode.getStatement().addChild(innerSuggestionNode.node)
          innerSuggestionNode.node = statementNode
          return innerSuggestionNode
        })
      staticSuggestions = staticSuggestions.concat(allSuggestions)
    })
    return staticSuggestions
  }
}

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

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (this.getStatement().getCount() !== 0) {
      const child = this.getStatement().getChild(0)
      return child.recursivelyApplyRuntimeCapture(capture)
    }
    return false
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
      [new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'statement')],
      NodeBoxType.INVISIBLE
    )

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_STATEMENT, NodeCategory.PythonStatement, new PythonStatementGenerator())

    registerBlankFillForNodeCategory(NodeCategory.PythonStatement, () => {
      return new PythonStatement(null)
    })
  }
}
