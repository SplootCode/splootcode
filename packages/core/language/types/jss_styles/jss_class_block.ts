import * as recast from 'recast'

import { ChildSetType } from '../../childset'
import { DeclaredIdentifier } from '../js/declared_identifier'
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
import { LOCAL_STYLES_IDENTIFIER } from './jss_style_block'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from '../../node_category_registry'
import { ObjectPropertyKind } from 'ast-types/gen/kinds'
import { ParentReference, SplootNode } from '../../node'
import { SuggestedNode } from '../../suggested_node'
import { TypeExpression } from '../../definitions/loader'
import { addPropertyToTypeExpression } from '../../scope/scope'

export const JSS_CLASS_BLOCK = 'JSS_CLASS_BLOCK'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new JssClassBlock(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'class', 'class', true, 'A css class block.')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class JssClassBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_CLASS_BLOCK)
    this.addChildSet('identifier', ChildSetType.Single, NodeCategory.DeclaredIdentifier)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssStyleProperties)
  }

  getIdentifier() {
    return this.getChildSet('identifier')
  }

  getBody() {
    return this.getChildSet('body')
  }

  addSelfToScope() {
    if (this.getIdentifier().getCount() === 0) {
      return
    }
    const scope = this.getScope()
    // TODO: Check parent is a local style block, not a named style block (when we implement that).
    // Probably should fetch this var name from the parent.
    const stylesVar = scope.getVariableDefintionByName(LOCAL_STYLES_IDENTIFIER)
    const typeExpression = stylesVar.type
    const classesType = stylesVar.type.objectProperties['classes']
    const classType: TypeExpression = { type: 'any' }
    const identifier = (this.getIdentifier().getChild(0) as DeclaredIdentifier).getName()
    typeExpression.objectProperties['classes'] = addPropertyToTypeExpression(classesType, identifier, classType)
    scope.replaceVariableTypeExpression(LOCAL_STYLES_IDENTIFIER, typeExpression)
  }

  generateJsAst(): ObjectPropertyKind {
    // A JSS class is of the form: foo: { color: 'red' }
    const key = recast.types.builders.identifier((this.getIdentifier().getChild(0) as DeclaredIdentifier).getName())
    const properties = this.getBody().children.map((node) => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind
    })
    const value = recast.types.builders.objectExpression(properties)
    return recast.types.builders.objectProperty(key, value)
  }

  static deserializer(serializedNode: SerializedNode): JssClassBlock {
    const node = new JssClassBlock(null)
    node.deserializeChildSet('identifier', serializedNode)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = JSS_CLASS_BLOCK
    typeRegistration.deserializer = JssClassBlock.deserializer
    typeRegistration.hasScope = false
    typeRegistration.properties = ['identifier']
    typeRegistration.childSets = { identifier: NodeCategory.DeclaredIdentifier, body: NodeCategory.JssStyleProperties }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'class'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'identifier'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    typeRegistration.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(typeRegistration)
    registerNodeCateogry(JSS_CLASS_BLOCK, NodeCategory.JssBodyContent, new Generator())
    registerNodeCateogry(JSS_CLASS_BLOCK, NodeCategory.JssStyleProperties, new Generator())
  }
}
