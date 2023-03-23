import * as recast from 'recast'

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
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'

export const FOR_EACH_EXPRESSION = 'FOR_EACH_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ForEachExpression(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for each', 'for each', true)
    return [suggestedNode]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier'),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable', ['list or other iterable']),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(FOR_EACH_EXPRESSION, NodeCategory.Expression)
    registerAutocompleter(NodeCategory.Expression, new Generator())
  }
}
