import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeAnnotation,
  NodeAnnotationType,
  NodeBoxType,
  NodeCategory,
  NodeLayout,
  NodeMutation,
  NodeMutationType,
  ParentReference,
  SerializedNode,
  SingleStatementData,
  SplootFragment,
  SplootNode,
  StatementCapture,
  TypeRegistration,
  getSideEffectAnnotations,
  registerAutocompleteAdapter,
  registerBlankFillForNodeCategory,
  registerFragmentAdapter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { ExpressionNode } from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonArgument } from './python_argument'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { parseToPyright, validateExpressionParse } from './utils'

export const PYTHON_EXPRESSION = 'PYTHON_EXPRESSION'

export class PythonExpression extends PythonNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_EXPRESSION)
    this.addChildSet('tokens', ChildSetType.Many, NodeCategory.PythonExpressionToken)
  }

  getTokenSet() {
    return this.getChildSet('tokens')
  }

  isEmptyExpression(): boolean {
    return this.getTokenSet().getCount() === 0
  }

  clean() {
    // If this expression is now empty, call `clean` on the parent.
    // If the parent doesn't allow empty expressions, it'll delete it.
    if (this.getTokenSet().getCount() === 0) {
      this.parent.node.clean()
    }
  }

  isEmpty(): boolean {
    return this.getTokenSet().children.length === 0
  }

  allowEmpty() {
    if (this.isEmpty()) {
      this.setValidity(true, '')
    }
  }

  requireNonEmpty(message: string): void {
    if (this.isEmpty()) {
      this.setValidity(false, message)
    }
  }

  validateSelf(): void {
    const tokens = this.getTokenSet().children
    if (tokens.length === 0) {
      // Empty expressions are valid in some circumstances - let the parent deal with this.
      this.parent.node.validateSelf()
    } else {
      const [valid, tokenIndex] = validateExpressionParse(this.getTokenSet().children)
      if (valid) {
        this.setValidity(true, '')
      } else {
        const blameIndex = Math.min(tokenIndex, tokens.length - 1)
        this.setValidity(false, 'Unexpected token', 'tokens', blameIndex)
      }
    }
  }

  static deserializer(serializedNode: SerializedNode): PythonExpression {
    const res = new PythonExpression(null)
    res.deserializeChildSet('tokens', serializedNode)
    return res
  }

  generateParseTree(parseMapper: ParseMapper): ExpressionNode {
    const exprNode = parseToPyright(parseMapper, this.getTokenSet().children)
    return exprNode
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      return true
    }
    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      this.recursivelyClearRuntimeCapture()
      return false
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
    return true
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
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.NONE,
      [new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'tokens')],
      NodeBoxType.INVISIBLE
    )
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
      PY_ARG: (node: SplootNode) => {
        const arg = new PythonArgument(null)
        arg.getArgument().addChild(node)
        return arg
      },
    }

    registerType(typeRegistration)
    // When needed create the expression while autocompleting the expresison token.
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonStatementContents)
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonExpression)
    registerNodeCateogry(PYTHON_EXPRESSION, NodeCategory.PythonFunctionArgumentValue)

    registerAutocompleteAdapter(NodeCategory.PythonStatementContents, NodeCategory.PythonExpressionToken)
    registerAutocompleteAdapter(NodeCategory.PythonExpression, NodeCategory.PythonExpressionToken)

    registerFragmentAdapter(NodeCategory.PythonExpressionToken, PYTHON_EXPRESSION, (fragment: SplootFragment) => {
      const expr = new PythonExpression(null)
      fragment.nodes.forEach((node) => {
        expr.getTokenSet().addChild(node)
      })
      return expr
    })

    registerBlankFillForNodeCategory(NodeCategory.PythonExpression, () => {
      return new PythonExpression(null)
    })
  }
}
