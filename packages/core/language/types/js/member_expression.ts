import * as recast from 'recast'

import { SplootNode, ParentReference } from '../../node'
import { ChildSetType } from '../../childset'
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from '../../node_category_registry'
import {
  TypeRegistration,
  NodeLayout,
  LayoutComponent,
  LayoutComponentType,
  registerType,
  SerializedNode,
} from '../../type_registry'
import { SuggestedNode } from '../../suggested_node'
import { VariableReference, VariableReferenceGenerator, VARIABLE_REFERENCE } from './variable_reference'
import { ExpressionKind, MemberExpressionKind } from 'ast-types/gen/kinds'
import { SplootExpression, SPLOOT_EXPRESSION } from './expression'
import { HighlightColorCategory } from '../../../colors'
import { CALL_MEMBER } from './call_member'
import { STRING_LITERAL } from './../literals'
import { JavaScriptSplootNode } from '../../javascript_node'

export const MEMBER_EXPRESSION = 'MEMBER_EXPRESSION'

class Generator implements SuggestionGenerator {
  variableGenerator: VariableReferenceGenerator

  constructor() {
    this.variableGenerator = new VariableReferenceGenerator()
  }

  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (index === 0) {
      return []
    }
    const leftChild = parent.getChildSet().getChild(index - 1)

    if (leftChild.type === VARIABLE_REFERENCE) {
      const variable = leftChild as VariableReference
      const members = parent.node.getScope().getVariableMembers(variable.getName())
      return members.map((memberDefinition) => {
        const name = memberDefinition.name
        const node = new MemberExpression(null)
        node.setMember(memberDefinition.name)
        return new SuggestedNode(
          node,
          `member ${name}`,
          name,
          true,
          memberDefinition.documentation ?? 'No documentation',
          'object'
        )
      })
    }
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    // need dynamic suggestions for when we can't infer the type.
    if (textInput.startsWith('.')) {
      const leftChild = parent.getChildSet().getChild(index - 1)
      if ([VARIABLE_REFERENCE, MEMBER_EXPRESSION, CALL_MEMBER, STRING_LITERAL].indexOf(leftChild.type) !== -1) {
        const name = textInput.substring(1) // Cut the '.' off
        const node = new MemberExpression(null)
        node.setMember(name)
        return [new SuggestedNode(node, `member ${name}`, name, true, 'Property of the object to the left', 'object')]
      }
    }
    return []
  }
}

export class MemberExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, MEMBER_EXPRESSION)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.ExpressionToken)
    this.setProperty('member', '')
  }

  getObjectExpressionToken() {
    return this.getChildSet('object')
  }

  setMember(identifier: string) {
    this.setProperty('member', identifier)
  }

  getMember() {
    return this.getProperty('member')
  }

  generateJsAst(): MemberExpressionKind {
    const member = recast.types.builders.identifier(this.getProperty('member'))

    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    const tempExpr = new SplootExpression(null)
    tempExpr.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone())
    const object = tempExpr.generateJsAst() as ExpressionKind
    const memberExpression = recast.types.builders.memberExpression(object, member)
    return memberExpression
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): MemberExpression {
    const node = new MemberExpression(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = MEMBER_EXPRESSION
    typeRegistration.deserializer = MemberExpression.deserializer
    typeRegistration.childSets = { object: NodeCategory.ExpressionToken }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(MEMBER_EXPRESSION, NodeCategory.ExpressionToken, new Generator())
  }
}
