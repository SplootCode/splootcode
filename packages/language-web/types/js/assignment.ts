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
import { ExpressionKind, IdentifierKind, MemberExpressionKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const ASSIGNMENT = 'ASSIGNMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new Assignment(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'set', 'set', true)
    return [suggestedNode]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class Assignment extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, ASSIGNMENT)
    this.addChildSet('left', ChildSetType.Immutable, NodeCategory.Expression)
    this.getChildSet('left').addChild(new SplootExpression(null))
    this.addChildSet('right', ChildSetType.Immutable, NodeCategory.Expression)
    this.getChildSet('right').addChild(new SplootExpression(null))
  }

  getLeft() {
    return this.getChildSet('left')
  }

  getRight() {
    return this.getChildSet('right')
  }

  generateJsAst() {
    const left = (this.getLeft().children[0] as JavaScriptSplootNode).generateJsAst() as
      | IdentifierKind
      | MemberExpressionKind
    const right = (this.getRight().children[0] as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    return recast.types.builders.assignmentExpression('=', left, right)
  }

  static deserializer(serializedNode: SerializedNode): Assignment {
    const node = new Assignment(null)
    node.getLeft().removeChild(0)
    node.deserializeChildSet('left', serializedNode)
    node.getRight().removeChild(0)
    node.deserializeChildSet('right', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = ASSIGNMENT
    typeRegistration.deserializer = Assignment.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      left: NodeCategory.Expression,
      right: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'set'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'left', ['variable']),
      new LayoutComponent(LayoutComponentType.KEYWORD, '='),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'right', ['value']),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(ASSIGNMENT, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
