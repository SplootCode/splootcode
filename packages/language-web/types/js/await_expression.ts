import * as recast from 'recast'

import { ASTNode } from 'ast-types'
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
import { ExpressionKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const AWAIT_EXPRESSION = 'AWAIT_EXPRESSION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new AwaitExpression(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'await', 'await', true, 'wait for result')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class AwaitExpression extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, AWAIT_EXPRESSION)
    this.addChildSet('expression', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('expression').addChild(new SplootExpression(null))
  }

  getExpression() {
    return this.getChildSet('expression')
  }

  generateJsAst(): ASTNode {
    const expression = (this.getExpression().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    return recast.types.builders.awaitExpression(expression)
  }

  static deserialize(serializedNode: SerializedNode): AwaitExpression {
    const node = new AwaitExpression(null)
    node.getExpression().removeChild(0)
    node.deserializeChildSet('expression', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = AWAIT_EXPRESSION
    typeRegistration.deserializer = AwaitExpression.deserialize
    typeRegistration.childSets = {
      expression: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'await'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'expression'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(AWAIT_EXPRESSION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
