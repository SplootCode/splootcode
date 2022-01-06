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
import { NodeAnnotation, NodeAnnotationType, getSideEffectAnnotations } from '../../annotations/annotations'
import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleteFunctionsForCategory,
  registerNodeCateogry,
} from '../../node_category_registry'
import { NodeMutation, NodeMutationType } from '../../mutations/node_mutations'
import { ParentReference, SplootNode } from '../../node'
import { PythonStatement } from './python_statement'
import { SingleStatementData, StatementCapture } from '../../capture/runtime_capture'
import { SuggestedNode } from '../../suggested_node'

export const PYTHON_EXPRESSION = 'PYTHON_EXPRESSION'

class PythonExpressionGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // Get all static expression tokens available and wrap them in an expression node.
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonExpressionToken)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const expressionSuggestions = generator
        .staticSuggestions(parent, index)
        .map((tokenNodeSuggestion: SuggestedNode) => {
          const expressionNode = new PythonExpression(null)
          expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node)
          tokenNodeSuggestion.node = expressionNode
          return tokenNodeSuggestion
        })
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    const suggestionGeneratorSet = getAutocompleteFunctionsForCategory(NodeCategory.PythonExpressionToken)
    let staticSuggestions = [] as SuggestedNode[]
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      const expressionSuggestions = generator
        .dynamicSuggestions(parent, index, textInput)
        .map((tokenNodeSuggestion: SuggestedNode) => {
          const expressionNode = new PythonExpression(null)
          expressionNode.getTokenSet().addChild(tokenNodeSuggestion.node)
          tokenNodeSuggestion.node = expressionNode
          return tokenNodeSuggestion
        })
      staticSuggestions = staticSuggestions.concat(expressionSuggestions)
    })
    return staticSuggestions
  }
}

export class PythonExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_EXPRESSION)
    this.addChildSet('tokens', ChildSetType.Many, NodeCategory.PythonExpressionToken)
  }

  getTokenSet() {
    return this.getChildSet('tokens')
  }

  clean() {
    // If this expression is now empty, call `clean` on the parent.
    // If the parent doesn't allow empty expressions, it'll delete it.
    if (this.getTokenSet().getCount() === 0) {
      this.parent.node.clean()
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonExpression {
    const res = new PythonExpression(null)
    res.deserializeChildSet('tokens', serializedNode)
    return res
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture) {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
    }
    const annotations: NodeAnnotation[] = getSideEffectAnnotations(capture)
    const data = capture.data as SingleStatementData
    if (annotations.length === 0 || data.resultType !== 'NoneType') {
      annotations.push({
        type: NodeAnnotationType.ReturnValue,
        value: {
          type: data.resultType,
          value: data.result,
        },
      })
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotations
    this.fireMutation(mutation)
    return
  }

  recursivelyClearRuntimeCapture() {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_EXPRESSION
    typeRegistration.deserializer = PythonExpression.deserializer
    typeRegistration.properties = ['tokens']
    typeRegistration.childSets = { tokens: NodeCategory.PythonExpressionToken }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'tokens'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    // When needed create the expression while autocompleting the expresison token.
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonStatementContents, new PythonExpressionGenerator())
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonExpression, new PythonExpressionGenerator())
  }
}
