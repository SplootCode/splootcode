import * as recast from 'recast'

import { CallExpressionKind, ExpressionKind } from 'ast-types/gen/kinds'
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
import { sanitizeIdentifier } from './variable_reference'

export const CALL_VARIABLE = 'CALL_VARIABLE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    const varName = sanitizeIdentifier(textInput)
    const newVar = new CallVariable(null, varName)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return []
    }

    const suggestedNode = new SuggestedNode(newVar, `call var ${varName}`, '', false, 'undeclared function')
    return [suggestedNode]
  }
}

export class CallVariable extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string, argCount = 0) {
    super(parentReference, CALL_VARIABLE)
    this.setProperty('identifier', name)
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.Expression)
    for (let i = 0; i < argCount; i++) {
      this.getArguments().addChild(new SplootExpression(null))
    }
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  getIdentifier() {
    return this.properties.identifier
  }

  setIdentifier(identifier: string) {
    this.properties.identifiter = identifier
  }

  generateJsAst(): CallExpressionKind {
    const identifier = recast.types.builders.identifier(this.getIdentifier())
    const args = this.getArguments().children.map((argNode: JavaScriptSplootNode) => {
      return argNode.generateJsAst() as ExpressionKind
    })
    const call = recast.types.builders.callExpression(identifier, args)
    return call
  }

  getArgumentNames(): string[] {
    // TODO: Support autocompleting argument names
    return []
  }

  getNodeLayout(): NodeLayout {
    const layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments', this.getArgumentNames()),
    ])
    return layout
  }

  static deserializer(serializedNode: SerializedNode): CallVariable {
    const node = new CallVariable(null, serializedNode.properties['identifier'])
    node.deserializeChildSet('arguments', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = CALL_VARIABLE
    typeRegistration.deserializer = CallVariable.deserializer
    typeRegistration.childSets = { arguments: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'arguments'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(CALL_VARIABLE, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
