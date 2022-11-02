import * as recast from 'recast'
import { ObjectPropertyKind } from 'ast-types/gen/kinds'

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
import { JavaScriptSplootNode } from '../../javascript_node'
import { STRING_LITERAL, StringLiteral } from '../js/literals'
import { getCssProperties } from '../css/css_properties'

export const JSS_STYLE_PROPERTY = 'JSS_STYLE_PROPERTY'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const res = []
    for (const prop of getCssProperties()) {
      res.push(new SuggestedNode(new JssStyleProperty(null, prop), 'style-prop ' + prop, prop, true))
    }
    return res
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class JssStyleProperty extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, property: string) {
    super(parentReference, JSS_STYLE_PROPERTY)
    this.setProperty('property', property)
    this.addChildSet('value', ChildSetType.Single, NodeCategory.StyleSheetPropertyValue)
  }

  getPropertyName(): string {
    return this.getProperty('property')
  }

  getValue() {
    return this.getChildSet('value')
  }

  generateJsAst(): ObjectPropertyKind {
    const valueNode = this.getValue().getChild(0)
    let value = recast.types.builders.stringLiteral('')
    if (valueNode.type === STRING_LITERAL) {
      value = (valueNode as StringLiteral).generateJsAst()
    }
    const propName = this.getPropertyName()
    const key = recast.types.builders.stringLiteral(propName)
    return recast.types.builders.objectProperty(key, value)
  }

  static deserializer(serializedNode: SerializedNode): JssStyleProperty {
    const doc = new JssStyleProperty(null, serializedNode.properties['property'])
    doc.deserializeChildSet('value', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = JSS_STYLE_PROPERTY
    typeRegistration.deserializer = JssStyleProperty.deserializer
    typeRegistration.childSets = {
      value: NodeCategory.StyleSheetPropertyValue,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.STYLE_PROPERTY, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'property'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(JSS_STYLE_PROPERTY, NodeCategory.JssStyleProperties)
    registerAutocompleter(NodeCategory.JssStyleProperties, new Generator())
  }
}
