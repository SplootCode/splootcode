import * as recast from 'recast'

import { ParentReference } from '../../node'
import { ChildSetType } from '../../childset'
import { NodeCategory, registerNodeCateogry, SuggestionGenerator } from '../../node_category_registry'
import {
  TypeRegistration,
  NodeLayout,
  LayoutComponent,
  LayoutComponentType,
  registerType,
  SerializedNode,
} from '../../type_registry'
import { SuggestedNode } from '../../suggested_node'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import { StringLiteral } from '../literals'
import { DeclaredIdentifier, DECLARED_IDENTIFIER } from './declared_identifier'
import { IdentifierKind } from 'ast-types/gen/kinds'

export const IMPORT_DEFAULT = 'IMPORT_DEFAULT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ImportDefaultStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'import', 'import', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class ImportDefaultStatement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, IMPORT_DEFAULT)
    this.addChildSet('source', ChildSetType.Single, NodeCategory.ModuleSource)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
  }

  getSource() {
    return this.getChildSet('source')
  }

  getIdentifier() {
    return this.getChildSet('identifier')
  }

  generateJsAst() {
    const identifierNode = this.getIdentifier().getChild(0)
    let identifier: IdentifierKind = null
    if (identifierNode.type === DECLARED_IDENTIFIER) {
      identifier = (identifierNode as DeclaredIdentifier).generateJsAst()
    }
    const specifier = recast.types.builders.importDefaultSpecifier(identifier)
    const source = (this.getSource().getChild(0) as StringLiteral).generateJsAst()
    return recast.types.builders.importDeclaration([specifier], source)
  }

  static deserializer(serializedNode: SerializedNode): ImportDefaultStatement {
    const node = new ImportDefaultStatement(null)
    node.deserializeChildSet('source', serializedNode)
    node.deserializeChildSet('identifier', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = IMPORT_DEFAULT
    typeRegistration.deserializer = ImportDefaultStatement.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = {
      source: NodeCategory.ModuleSource,
      identifier: NodeCategory.DeclaredIdentifier,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.KEYWORD, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'import default'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'source'),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'as'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'identifier'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(IMPORT_DEFAULT, NodeCategory.Statement, new Generator())
  }
}
