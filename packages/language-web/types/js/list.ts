import * as recast from 'recast'

import { ArrayExpressionKind, ExpressionKind } from 'ast-types/gen/kinds'
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
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const LIST_EXPRESSION = 'LIST_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new ListExpression(null), 'list', 'list array', true)]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class ListExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, LIST_EXPRESSION)
    this.addChildSet('values', ChildSetType.Many, NodeCategory.Expression)
  }

  getValues() {
    return this.getChildSet('values')
  }

  generateJsAst(): ArrayExpressionKind {
    const values = this.getValues().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ExpressionKind
    })
    const listInit = recast.types.builders.arrayExpression(values)
    return listInit
  }

  clean() {
    this.getValues().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getValues().removeChild(index)
        }
      }
    })
  }

  getArgumentNames(): string[] {
    // Generate an array ['0', '1', '2', ...] for the number of list items.
    const count = this.getValues().getCount()
    return Array.from(Array(count).keys()).map((v) => v.toString())
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'values', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): ListExpression {
    const node = new ListExpression(null)
    node.deserializeChildSet('values', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = LIST_EXPRESSION
    typeRegistration.deserializer = ListExpression.deserializer
    typeRegistration.childSets = { values: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'list'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'values'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(LIST_EXPRESSION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
