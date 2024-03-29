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
import { JavaScriptSplootNode } from '../../javascript_node'
import { ObjectExpressionKind, ObjectPropertyKind } from 'ast-types/gen/kinds'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const OBJECT_EXPRESSION = 'OBJECT_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new ObjectExpression(null), 'object', 'object map dictionary', true)]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class ObjectExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, OBJECT_EXPRESSION)
    this.addChildSet('properties', ChildSetType.Many, NodeCategory.ObjectPropertyDeclaration)
  }

  getProperties() {
    return this.getChildSet('properties')
  }

  generateJsAst(): ObjectExpressionKind {
    const properties = this.getProperties().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ObjectPropertyKind
    })
    const objExpression = recast.types.builders.objectExpression(properties)
    return objExpression
  }

  static deserializer(serializedNode: SerializedNode): ObjectExpression {
    const node = new ObjectExpression(null)
    node.deserializeChildSet('properties', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = OBJECT_EXPRESSION
    typeRegistration.deserializer = ObjectExpression.deserializer
    typeRegistration.childSets = { values: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.LITERAL_LIST, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'object'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'properties'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(OBJECT_EXPRESSION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
