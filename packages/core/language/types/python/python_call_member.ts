import {
  ArgumentCategory,
  ArgumentNode,
  CallNode,
  ExpressionNode,
  MemberAccessNode,
  NameNode,
  ParseNode,
  ParseNodeType,
  TokenType,
} from '@splootcode/../../pyright/packages/sploot-checker/dist/sploot-checker'
import { ChildSetType } from '../../childset'
import { FunctionArgType, FunctionSignature } from '../../scope/types'
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
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '../../node'
import { ParseMapper } from '../../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { parseToPyright } from './utils'

export const PYTHON_CALL_MEMBER = 'PYTHON_CALL_MEMBER'

export class PythonCallMember extends PythonNode {
  constructor(parentReference: ParentReference, signature: FunctionSignature = null) {
    super(parentReference, PYTHON_CALL_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonExpression)
    const paramNames = []
    if (signature) {
      signature.arguments.forEach((arg) => {
        paramNames.push(arg.name)
        if (
          (arg.type === FunctionArgType.PositionalOnly || arg.type === FunctionArgType.PositionalOrKeyword) &&
          !arg.defaultValue
        ) {
          this.getArguments().addChild(new PythonExpression(null))
        }
      })
    }
    this.metadata.set('params', paramNames)
  }

  getObjectExpressionToken() {
    return this.getChildSet('object')
  }

  getMember(): string {
    return this.getProperty('member')
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier)
  }

  getChildrenToKeepOnDelete(): SplootNode[] {
    return this.getObjectExpressionToken().children
  }

  validateSelf(): void {
    if (this.getObjectExpressionToken().getCount() === 0) {
      this.setValidity(false, 'Needs object', 'object')
    } else {
      this.setValidity(true, '')
    }
    const elements = this.getArguments().children
    if (elements.length == 1) {
      ;(elements[0] as PythonExpression).allowEmpty()
    } else {
      elements.forEach((expression: PythonExpression, idx) => {
        expression.requireNonEmpty('Cannot have empty function arguments')
      })
    }
  }

  getArgumentNames() {
    return this.metadata.get('params') || []
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const objectExpr: ExpressionNode = parseToPyright(parseMapper, this.getObjectExpressionToken().children)
    const memberName: NameNode = {
      nodeType: ParseNodeType.Name,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      token: { type: TokenType.Identifier, start: 0, length: 0, value: this.getMember() },
      value: this.getMember(),
    }
    const memberExpr: MemberAccessNode = {
      nodeType: ParseNodeType.MemberAccess,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      leftExpression: objectExpr,
      memberName: memberName,
    }
    memberName.parent = memberExpr
    objectExpr.parent = memberExpr

    const callVarExpr: CallNode = {
      nodeType: ParseNodeType.Call,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      arguments: this.getArguments().children.map((argNode) => {
        const ret: ArgumentNode = {
          nodeType: ParseNodeType.Argument,
          argumentCategory: ArgumentCategory.Simple,
          id: parseMapper.getNextId(),
          start: 0,
          length: 0,
          valueExpression: null,
        }
        const valueExpression = parseToPyright(parseMapper, (argNode as PythonExpression).getTokenSet().children)
        if (valueExpression) {
          ret.valueExpression = valueExpression
          ret.valueExpression.parent = ret
        }
        return ret
      }),
      leftExpression: memberExpr,
      trailingComma: false,
    }
    if (memberExpr) {
      memberExpr.parent = callVarExpr
    }
    if (objectExpr) {
      callVarExpr.leftExpression.parent = callVarExpr
    }
    callVarExpr.arguments.forEach((arg) => (arg.parent = callVarExpr))
    parseMapper.addNode(this, callVarExpr)
    return callVarExpr
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonCallMember {
    const node = new PythonCallMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    node.deserializeChildSet('arguments', serializedNode)
    if (serializedNode.meta) {
      for (const metakey in serializedNode.meta) {
        node.metadata.set(metakey, serializedNode.meta[metakey])
      }
    }
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_CALL_MEMBER
    typeRegistration.deserializer = PythonCallMember.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_CALL_MEMBER, NodeCategory.PythonExpressionToken)
  }
}
