import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  TypeRegistration,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { ExpressionNode, MemberAccessNode, NameNode, ParseNodeType, TokenType } from 'structured-pyright'
import { FunctionSignature } from '../scope/types'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonCallNode } from './python_call_node'
import { parseToPyright } from './utils'

export const PYTHON_CALL_MEMBER = 'PYTHON_CALL_MEMBER'

export class PythonCallMember extends PythonCallNode {
  constructor(parentReference: ParentReference, signature: FunctionSignature = null) {
    super(parentReference, PYTHON_CALL_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
    this.initArgumentsChildSet(signature)
    if (signature?.typeIfMethod) {
      this.metadata.set('objectType', signature.typeIfMethod)
    }
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
    this.validateArguments()
  }

  getArgumentNames() {
    return this.metadata.get('params') || []
  }

  getObjectType() {
    return this.metadata.get('objectType') || ''
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  generateLeftExpression(parseMapper: ParseMapper): ExpressionNode {
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
    return memberExpr
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object', [this.getObjectType()]),
      new LayoutComponent(LayoutComponentType.CAP, '.'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
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
      arguments: NodeCategory.PythonFunctionArgument,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object', ['object']),
      new LayoutComponent(LayoutComponentType.CAP, '.'),
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
