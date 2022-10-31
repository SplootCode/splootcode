import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core'
import { ExpressionKind, MemberExpressionKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '@splootcode/core'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, SuggestionGenerator, registerAutocompleter, registerNodeCateogry } from '@splootcode/core'
import { ParentReference, SplootNode } from '@splootcode/core'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { SuggestedNode } from '@splootcode/core'

export const LOOKUP_EXPRESSION = 'LOOKUP_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    return [new SuggestedNode(new LookupExpression(null), 'item', 'item index get', true)]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class LookupExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LOOKUP_EXPRESSION)
    this.addChildSet('object', ChildSetType.Single, NodeCategory.ExpressionToken)
    this.addChildSet('property', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('property').addChild(new SplootExpression(null))
  }

  getObjectExpressionToken() {
    return this.getChildSet('object')
  }

  getPropertyExpression(): SplootExpression {
    return this.getChildSet('property').getChild(0) as SplootExpression
  }

  generateJsAst(): MemberExpressionKind {
    // Create expression from a single token.
    // There's a more efficient way to do this but this'll do for now.
    const objectExpression = new SplootExpression(null)
    objectExpression.getTokenSet().addChild(this.getObjectExpressionToken().getChild(0).clone())
    const object = objectExpression.generateJsAst() as ExpressionKind
    const propExpressionAst = this.getPropertyExpression().generateJsAst()
    const memberExpression = recast.types.builders.memberExpression(object, propExpressionAst, true)
    return memberExpression
  }

  static deserializer(serializedNode: SerializedNode): LookupExpression {
    const node = new LookupExpression(null)
    node.deserializeChildSet('object', serializedNode)
    node.getChildSet('property').removeChild(0)
    node.deserializeChildSet('property', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = LOOKUP_EXPRESSION
    typeRegistration.deserializer = LookupExpression.deserializer
    typeRegistration.childSets = {
      object: NodeCategory.ExpressionToken,
      property: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'object'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'property', ['item']),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(LOOKUP_EXPRESSION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
