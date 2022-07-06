import { MemberAccessNode, ParseNode, ParseNodeType, TokenType } from 'structured-pyright'

import { ChildSetType } from '@splootcode/core/language/childset'
import { HighlightColorCategory } from '@splootcode/core/colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core/language/node_category_registry'
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'
import { ValueType } from '../scope/types'
import { parseToPyright } from './utils'

export const PYTHON_MEMBER = 'PYTHON_MEMBER'

export class PythonMember extends PythonNode {
  constructor(parentReference: ParentReference, typeInfo?: ValueType) {
    super(parentReference, PYTHON_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.PythonExpressionToken)
    this.setProperty('member', '')
    if (typeInfo?.typeIfAttr) {
      this.metadata.set('objectType', typeInfo.typeIfAttr)
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

  getObjectType() {
    return this.metadata.get('objectType') || ''
  }

  generateParseTree(parseMapper: ParseMapper): ParseNode {
    const memberName = this.getMember()
    const memberAccessNode: MemberAccessNode = {
      nodeType: ParseNodeType.MemberAccess,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      leftExpression: parseToPyright(parseMapper, this.getObjectExpressionToken().children),
      memberName: {
        nodeType: ParseNodeType.Name,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
        token: { type: TokenType.Identifier, start: 0, length: 0, value: memberName },
        value: memberName,
      },
    }
    memberAccessNode.leftExpression.parent = memberAccessNode
    memberAccessNode.memberName.parent = memberAccessNode
    parseMapper.addNode(this, memberAccessNode)
    return memberAccessNode
  }

  validateSelf(): void {
    if (this.getObjectExpressionToken().getCount() === 0) {
      this.setValidity(false, 'Needs object', 'object')
    } else {
      this.setValidity(true, '')
    }
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object', [this.getObjectType()]),
      new LayoutComponent(LayoutComponentType.CAP, '.'),
      new LayoutComponent(LayoutComponentType.KEYWORD, this.getMember()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): PythonMember {
    const node = new PythonMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    if (serializedNode.meta) {
      for (const metakey in serializedNode.meta) {
        node.metadata.set(metakey, serializedNode.meta[metakey])
      }
    }
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_MEMBER
    typeRegistration.deserializer = PythonMember.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.PythonExpressionToken,
      arguments: NodeCategory.PythonExpression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.CAP, '.'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_MEMBER, NodeCategory.PythonExpressionToken)
  }
}
