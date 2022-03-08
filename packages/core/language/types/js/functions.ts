import * as recast from 'recast'

import { ChildSetType } from '../../childset'
import { DeclaredIdentifier } from './declared_identifier'
import { ExpressionKind, FunctionDeclarationKind, IdentifierKind } from 'ast-types/gen/kinds'
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
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const FUNCTION_DECLARATION = 'FUNCTION_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new FunctionDeclaration(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'function', 'function', true, 'A new function block.')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class FunctionDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, FUNCTION_DECLARATION)
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

  clean() {
    this.getBody().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getBody().removeChild(index)
        }
      }
    })
  }

  generateJsAst(): FunctionDeclarationKind {
    const statements = []
    const params = this.getParams().children.map((param) => {
      const id = param as DeclaredIdentifier
      return id.generateJsAst()
    })
    this.getBody().children.forEach((node: JavaScriptSplootNode) => {
      let ast = node.generateJsAst()
      if (node.type === SPLOOT_EXPRESSION) {
        ast = recast.types.builders.expressionStatement(ast as ExpressionKind)
      }
      if (ast !== null) {
        statements.push(ast)
      }
    })
    const block = recast.types.builders.blockStatement(statements)
    const identifier = (this.getIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind
    return recast.types.builders.functionDeclaration(identifier, params, block)
  }

  static deserializer(serializedNode: SerializedNode): FunctionDeclaration {
    const node = new FunctionDeclaration(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.deserializeChildSet('params', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const functionType = new TypeRegistration()
    functionType.typeName = FUNCTION_DECLARATION
    functionType.deserializer = FunctionDeclaration.deserializer
    functionType.hasScope = true
    functionType.properties = ['identifier']
    functionType.childSets = { params: NodeCategory.DeclaredIdentifier, body: NodeCategory.Statement }
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'function'),
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
    registerNodeCateogry(FUNCTION_DECLARATION, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
