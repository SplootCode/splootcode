import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core'
import { ExportDeclarationKind, ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
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
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'
import { SuggestedNode } from '@splootcode/core'

export const COMPONENT_DECLARATION = 'COMPONENT_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ComponentDeclaration(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'component', 'component', true, 'A new component.')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class ComponentDeclaration extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, COMPONENT_DECLARATION)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
    this.addChildSet('props', ChildSetType.Many, NodeCategory.ComponentPropertyDeclaration)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.Statement)
  }

  getIdentifier() {
    return this.getChildSet('identifier')
  }

  getProps() {
    return this.getChildSet('props')
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

  generateJsAst(): ExportDeclarationKind {
    const statements = []
    const params = [recast.types.builders.identifier('props')]
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
    return recast.types.builders.exportDeclaration(
      false,
      recast.types.builders.functionDeclaration(identifier, params, block)
    )
  }

  static deserializer(serializedNode: SerializedNode): ComponentDeclaration {
    const node = new ComponentDeclaration(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.deserializeChildSet('props', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = COMPONENT_DECLARATION
    typeRegistration.deserializer = ComponentDeclaration.deserializer
    typeRegistration.hasScope = true
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = { props: NodeCategory.ComponentPropertyDeclaration, body: NodeCategory.Statement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'component'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'props'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    typeRegistration.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(typeRegistration)
    registerNodeCateogry(COMPONENT_DECLARATION, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
