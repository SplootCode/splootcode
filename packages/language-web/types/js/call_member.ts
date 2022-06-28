import * as recast from 'recast'

import { CallExpressionKind, ExpressionKind } from 'ast-types/gen/kinds'
import { ChildSetType } from '@splootcode/core/language/childset'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core/language/type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '@splootcode/core/language/node_category_registry'
import { ParentReference, SplootNode } from '@splootcode/core/language/node'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { VARIABLE_REFERENCE, VariableReferenceGenerator } from './variable_reference'

import { HighlightColorCategory } from '@splootcode/core/colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import { MEMBER_EXPRESSION } from './member_expression'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { STRING_LITERAL } from '../js/literals'

export const CALL_MEMBER = 'CALL_MEMBER'

class Generator implements SuggestionGenerator {
  variableGenerator: VariableReferenceGenerator

  constructor() {
    this.variableGenerator = new VariableReferenceGenerator()
  }

  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // need dynamic suggestions for when we can't infer the type.
    if (textInput.startsWith('.')) {
      const leftChild = parent.getChildSet().getChild(index - 1)
      if ([VARIABLE_REFERENCE, MEMBER_EXPRESSION, CALL_MEMBER, STRING_LITERAL].indexOf(leftChild.type) !== -1) {
        const name = textInput.substring(1) // Cut the '.' off
        const node = new CallMember(null)
        node.setMember(name)
        return [
          new SuggestedNode(node, `callmember ${name}`, name, true, 'Call method on object to the left', 'object'),
        ]
      }
    }
    return []
  }
}

export class CallMember extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, CALL_MEMBER)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.ExpressionToken)
    this.setProperty('member', '')
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression)
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

  getArguments() {
    return this.getChildSet('arguments')
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.KEYWORD, `.${this.getMember()}`),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    return layout
  }

  clean() {
    this.getArguments().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getArguments().removeChild(index)
        }
      }
    })
  }

  generateJsAst(): CallExpressionKind {
    const member = recast.types.builders.identifier(this.getProperty('member'))
    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    const tempExpr = new SplootExpression(null)
    tempExpr.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone())
    const object = tempExpr.generateJsAst() as ExpressionKind
    const memberExpression = recast.types.builders.memberExpression(object, member)
    const args = this.getArguments().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ExpressionKind
    })
    const call = recast.types.builders.callExpression(memberExpression, args)
    return call
  }

  static deserializer(serializedNode: SerializedNode): CallMember {
    const node = new CallMember(null)
    node.setMember(serializedNode.properties['member'])
    node.deserializeChildSet('object', serializedNode)
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = CALL_MEMBER
    typeRegistration.deserializer = CallMember.deserializer
    typeRegistration.childSets = { object: NodeCategory.Expression, arguments: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BREADCRUMBS, 'object'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'member'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(CALL_MEMBER, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
