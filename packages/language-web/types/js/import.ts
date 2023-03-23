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
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { DECLARED_IDENTIFIER, DeclaredIdentifier } from './declared_identifier'
import { IdentifierKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { StringLiteral } from './literals'

export const IMPORT = 'IMPORT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ImportStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'import', 'import', true)
    return [suggestedNode]
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class ImportStatement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, IMPORT)
    this.addChildSet('source', ChildSetType.Single, NodeCategory.ModuleSource)
    this.addChildSet('specifiers', ChildSetType.Many, NodeCategory.DeclaredIdentifier)
  }

  getSource() {
    return this.getChildSet('source')
  }

  getSpecifiers() {
    return this.getChildSet('specifiers')
  }

  generateJsAst() {
    const specifiers = this.getSpecifiers().children.map((node) => {
      let identifier: IdentifierKind = null
      if (node.type === DECLARED_IDENTIFIER) {
        identifier = (node as DeclaredIdentifier).generateJsAst()
      }
      return recast.types.builders.importSpecifier(identifier)
    })
    const source = (this.getSource().getChild(0) as StringLiteral).generateJsAst()
    return recast.types.builders.importDeclaration(specifiers, source)
  }

  static deserializer(serializedNode: SerializedNode): ImportStatement {
    const node = new ImportStatement(null)
    node.deserializeChildSet('source', serializedNode)
    node.deserializeChildSet('specifiers', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = IMPORT
    typeRegistration.deserializer = ImportStatement.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      source: NodeCategory.ModuleSource,
      specifiers: NodeCategory.DeclaredIdentifier,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'import'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'source'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'specifiers', ['values']),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(IMPORT, NodeCategory.Statement)
    registerAutocompleter(NodeCategory.Statement, new Generator())
  }
}
