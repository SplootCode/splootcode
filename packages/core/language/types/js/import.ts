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

export const IMPORT = 'IMPORT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new ImportStatement(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'import', 'import', true)
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
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
      new LayoutComponent(LayoutComponentType.CHILD_SET_INLINE, 'source'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'specifiers', 'values'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(IMPORT, NodeCategory.Statement, new Generator())
  }
}
