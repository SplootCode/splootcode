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
import { SplootExpression, SPLOOT_EXPRESSION } from '../js/expression'
import { ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds'
import { VariableDefinition } from '../../definitions/loader'
import { DeclaredIdentifier, DECLARED_IDENTIFIER } from '../js/declared_identifier'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'

export const FOR_EACH_EXPRESSION = 'FOR_EACH_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ForEachExpression(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for each', 'for each', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class ForEachExpression extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, FOR_EACH_EXPRESSION)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
    this.addChildSet('iterable', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('iterable').addChild(new SplootExpression(null))
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Expression)
  }

  getDeclarationIdentifier() {
    return this.getChildSet('identifier')
  }

  addSelfToScope() {
    const identifierChildSet = this.getDeclarationIdentifier()
    if (identifierChildSet.getCount() === 1 && identifierChildSet.getChild(0).type === DECLARED_IDENTIFIER) {
      this.getScope().addVariable({
        name: (this.getDeclarationIdentifier().getChild(0) as DeclaredIdentifier).getName(),
        deprecated: false,
        documentation: 'Local for-loop variable',
        type: { type: 'any' },
      } as VariableDefinition)
    }
  }

  getIterable() {
    return this.getChildSet('iterable')
  }

  getContent() {
    return this.getChildSet('content')
  }

  clean() {
    this.getContent().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getContent().removeChild(index)
        }
      }
    })
  }

  generateJsAst(): ExpressionKind {
    const id = (this.getDeclarationIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind
    const iterable = (this.getIterable().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    const content = this.getContent()
    if (content.getCount() === 0) {
      return null // Can't do anything here!
    }
    if (content.getCount() === 1) {
      const mapIdentifier = recast.types.builders.identifier('map')
      const mapExpr = recast.types.builders.memberExpression(iterable, mapIdentifier, false)
      const contentExpr = (content.getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
      const arrowFunc = recast.types.builders.arrowFunctionExpression([id], contentExpr)
      return recast.types.builders.callExpression(mapExpr, [arrowFunc])
    }
    return null
  }

  static deserialize(serializedNode: SerializedNode): ForEachExpression {
    const node = new ForEachExpression(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.getIterable().removeChild(0)
    node.deserializeChildSet('iterable', serializedNode)
    node.deserializeChildSet('content', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = FOR_EACH_EXPRESSION
    typeRegistration.deserializer = ForEachExpression.deserialize
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = {
      identifier: NodeCategory.DeclaredIdentifier,
      iterable: NodeCategory.Expression,
      content: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'for each'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable', 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(FOR_EACH_EXPRESSION, NodeCategory.Expression, new Generator())
  }
}
