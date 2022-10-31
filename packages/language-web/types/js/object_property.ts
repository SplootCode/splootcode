import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core'
import { ExpressionKind, ObjectPropertyKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '@splootcode/core'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, SuggestionGenerator, registerAutocompleter, registerNodeCateogry } from '@splootcode/core'
import { OBJECT_EXPRESSION, ObjectExpression } from './object_expression'
import { ParentReference, SplootNode } from '@splootcode/core'
import { SplootExpression } from './expression'
import { SuggestedNode } from '@splootcode/core'

export const OBJECT_PROPERTY = 'OBJECT_PROPERTY'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return [new SuggestedNode(new ObjectProperty(null, ''), 'property', '', true)]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return [new SuggestedNode(new ObjectProperty(null, textInput), 'property ' + textInput, 'object pro', true)]
  }
}

export class ObjectProperty extends SplootNode {
  constructor(parentReference: ParentReference, key: string) {
    super(parentReference, OBJECT_PROPERTY)
    this.setProperty('key', key)
    this.addChildSet('value', ChildSetType.Single, NodeCategory.Expression)
    this.getChildSet('value').addChild(new SplootExpression(null))
  }

  getKey(): string {
    return this.getProperty('key')
  }

  setKey(key: string) {
    this.setProperty('key', key)
  }

  getValue() {
    return this.getChildSet('value')
  }

  generateJsAst(): ObjectPropertyKind {
    const key = recast.types.builders.identifier(this.getKey())
    const value = (this.getValue().getChild(0) as JavaScriptSplootNode).generateJsAst() as ExpressionKind
    const property = recast.types.builders.objectProperty(key, value)
    return property
  }

  static deserializer(serializedNode: SerializedNode): ObjectProperty {
    const node = new ObjectProperty(null, serializedNode.properties['key'])
    node.getValue().removeChild(0)
    node.deserializeChildSet('value', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = OBJECT_PROPERTY
    typeRegistration.deserializer = ObjectProperty.deserializer
    typeRegistration.childSets = { values: NodeCategory.Expression }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.HTML_ATTRIBUTE,
      [
        new LayoutComponent(LayoutComponentType.PROPERTY, 'key'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
      ],
      NodeBoxType.SMALL_BLOCK
    )
    typeRegistration.pasteAdapters[OBJECT_EXPRESSION] = (node: SplootNode) => {
      const obj = new ObjectExpression(null)
      obj.getProperties().addChild(node)
      return obj
    }

    registerType(typeRegistration)
    registerNodeCateogry(OBJECT_PROPERTY, NodeCategory.ObjectPropertyDeclaration)
    registerAutocompleter(NodeCategory.ObjectPropertyDeclaration, new Generator())
  }
}
