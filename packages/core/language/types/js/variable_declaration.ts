import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import { ChildSetType } from '../../childset'
import { ExpressionKind, IdentifierKind } from 'ast-types/gen/kinds'
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
import { SplootExpression } from './expression'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const VARIABLE_DECLARATION = 'VARIABLE_DECLARATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new VariableDeclaration(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'declare', 'new variable', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class VariableDeclaration extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, VARIABLE_DECLARATION)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
    this.addChildSet('init', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('init').addChild(new SplootExpression(null))
  }

  getDeclarationIdentifier() {
    return this.getChildSet('identifier')
  }

  getInit() {
    return this.getChildSet('init')
  }

  generateJsAst(): ASTNode {
    const id = (this.getDeclarationIdentifier().getChild(0) as JavaScriptSplootNode).generateJsAst() as IdentifierKind
    const init = (this.getInit().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    const declarator = recast.types.builders.variableDeclarator(id, init)
    return recast.types.builders.variableDeclaration('let', [declarator])
  }

  static deserialize(serializedNode: SerializedNode): VariableDeclaration {
    const node = new VariableDeclaration(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.getInit().removeChild(0)
    node.deserializeChildSet('init', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = VARIABLE_DECLARATION
    typeRegistration.deserializer = VariableDeclaration.deserialize
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = {
      identifier: NodeCategory.DeclaredIdentifier,
      init: NodeCategory.Expression,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE_DECLARATION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'new variable'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'init'),
    ])
    typeRegistration.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(typeRegistration)
    registerNodeCateogry(VARIABLE_DECLARATION, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
