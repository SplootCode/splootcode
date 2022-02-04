import * as recast from 'recast'

import { ChildSetType } from '../../childset'
import { DeclaredIdentifier } from './declared_identifier'
import { ExpressionKind, FunctionDeclarationKind, IdentifierKind } from 'ast-types/gen/kinds'
import { FunctionDefinition } from '../../definitions/loader'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { SuggestedNode } from '../../suggested_node'

export const ASYNC_FUNCTION_DECLARATION = 'ASYNC_FUNCTION_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new AsyncFunctionDeclaration(null)
    const suggestedNode = new SuggestedNode(
      sampleNode,
      'async function',
      'async function',
      true,
      'A new asynchronous function block.'
    )
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class AsyncFunctionDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, ASYNC_FUNCTION_DECLARATION)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
    this.addChildSet('params', ChildSetType.Many, NodeCategory.DeclaredIdentifier)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement)
  }

  getIdentifier() {
    return this.getChildSet('identifier')
  }

  getParams() {
    return this.getChildSet('params')
  }

  getBody() {
    return this.getChildSet('body')
  }

  addSelfToScope() {
    if (this.getIdentifier().getCount() === 0) {
      // No identifier, we can't be added to the scope.
      return
    }
    const identifier = (this.getIdentifier().getChild(0) as DeclaredIdentifier).getName()

    this.getScope(true).addFunction({
      name: identifier,
      deprecated: false,
      documentation: 'Local async function',
      type: {
        parameters: [],
        returnType: { type: 'any' },
      },
    } as FunctionDefinition)
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

  static deserializer(serializedNode: SerializedNode): AsyncFunctionDeclaration {
    const node = new AsyncFunctionDeclaration(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.deserializeChildSet('params', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  generateJsAst(): FunctionDeclarationKind {
    const statements = []
    this.getBody().children.forEach((node: SplootNode) => {
      let ast = (node as JavaScriptSplootNode).generateJsAst()
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind)
      }
      if (ast !== null) {
        statements.push(ast)
      }
    })
    const block = recast.types.builders.blockStatement(statements)
    const identifier = (this.getIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind
    const result = recast.types.builders.functionDeclaration(identifier, [], block)
    result.async = true
    return result
  }

  static register() {
    const functionType = new TypeRegistration()
    functionType.typeName = ASYNC_FUNCTION_DECLARATION
    functionType.deserializer = AsyncFunctionDeclaration.deserializer
    functionType.hasScope = true
    functionType.properties = ['identifier']
    functionType.childSets = { params: NodeCategory.DeclaredIdentifier, body: NodeCategory.Statement }
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'async function'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE_BRACKETS, 'params'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(functionType)
    registerNodeCateogry(ASYNC_FUNCTION_DECLARATION, NodeCategory.Statement, new Generator())
  }
}
