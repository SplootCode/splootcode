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
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { ExpressionKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SplootExpression } from './expression'

export const RETURN_STATEMENT = 'RETURN_STATEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // TODO: Check if we're inside a function scope.
    const sampleNode = new ReturnStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'return', 'return', true, 'return a result from a function')
    return [suggestedNode]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class ReturnStatement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, RETURN_STATEMENT)
    this.addChildSet('expression', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('expression').addChild(new SplootExpression(null))
  }

  getExpression() {
    return this.getChildSet('expression')
  }

  generateJsAst(): ASTNode {
    const expression = (this.getExpression().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    return recast.types.builders.returnStatement(expression)
  }

  static deserialize(serializedNode: SerializedNode): ReturnStatement {
    const node = new ReturnStatement(null)
    node.getExpression().removeChild(0)
    node.deserializeChildSet('expression', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = RETURN_STATEMENT
    typeRegistration.deserializer = ReturnStatement.deserialize
    typeRegistration.childSets = {
      expression: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'return'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'expression'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(RETURN_STATEMENT, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
