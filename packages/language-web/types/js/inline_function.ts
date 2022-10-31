import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core'
import { DeclaredIdentifier } from './declared_identifier'
import { ExpressionKind, FunctionExpressionKind } from 'ast-types/gen/kinds'
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

export const INLINE_FUNCTION_DECLARATION = 'INLINE_FUNCTION_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new InlineFunctionDeclaration(null)
    const suggestedNode = new SuggestedNode(
      sampleNode,
      'inline function',
      'inline function',
      true,
      'An inline function or callback.'
    )
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class InlineFunctionDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, INLINE_FUNCTION_DECLARATION)
    this.addChildSet('params', ChildSetType.Many, NodeCategory.DeclaredIdentifier)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement)
  }

  getParams() {
    return this.getChildSet('params')
  }

  getBody() {
    return this.getChildSet('body')
  }

  generateJsAst(): FunctionExpressionKind {
    const params = this.getParams().children.map((param) => {
      const id = param as DeclaredIdentifier
      return id.generateJsAst()
    })
    const statements = []
    this.getBody().children.forEach((node: JavaScriptSplootNode) => {
      let ast = node.generateJsAst()
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind)
      }
      statements.push(ast)
    })
    const block = recast.types.builders.blockStatement(statements)
    return recast.types.builders.functionExpression(null, params, block)
  }

  static deserializer(serializedNode: SerializedNode): InlineFunctionDeclaration {
    const node = new InlineFunctionDeclaration(null)
    node.deserializeChildSet('params', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  clean() {
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index)
        }
      }
    })
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = INLINE_FUNCTION_DECLARATION
    typeRegistration.hasScope = true
    typeRegistration.deserializer = InlineFunctionDeclaration.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = { params: NodeCategory.DeclaredIdentifier, body: NodeCategory.Statement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'inline function'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    typeRegistration.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(INLINE_FUNCTION_DECLARATION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
