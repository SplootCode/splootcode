import * as csstree from 'css-tree'

import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
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
import { STRING_LITERAL, StringLiteral } from '../literals'
import { SuggestedNode } from '../../suggested_node'
import { getCssProperties } from '../../css/css_properties'

export const STYLE_PROPERTY = 'STYLE_PROPERTY'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const res = []
    for (const prop of getCssProperties()) {
      res.push(new SuggestedNode(new StyleProperty(null, prop), 'style-prop ' + prop, prop, true))
    }
    return res
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class StyleProperty extends SplootNode {
  constructor(parentReference: ParentReference, property: string) {
    super(parentReference, STYLE_PROPERTY)
    this.setProperty('property', property)
    this.addChildSet('value', ChildSetType.Single, NodeCategory.StyleSheetPropertyValue)
  }

  getPropertyName(): string {
    return this.getProperty('property')
  }

  getValue() {
    return this.getChildSet('value')
  }

  getCssAst(): csstree.Declaration {
    const valueChildren = new csstree.List()
    const valueNode = this.getValue().getChild(0)
    if (valueNode.type === STRING_LITERAL) {
      valueChildren.push({
        type: 'Raw',
        value: (valueNode as StringLiteral).getValue(),
      } as csstree.Raw)
    }
    const property = {
      type: 'Declaration',
      important: false,
      property: this.getPropertyName(),
      value: {
        type: 'Value',
        children: valueChildren,
      },
    } as csstree.Declaration
    return property
  }

  generateCodeString() {
    if (this.getValue().getCount() === 0) {
      return ''
    }
    const child = this.getValue().getChild(0)
    if (child.type === STRING_LITERAL) {
      return (child as StringLiteral).getValue()
    }
  }

  static deserializer(serializedNode: SerializedNode): StyleProperty {
    const doc = new StyleProperty(null, serializedNode.properties['property'])
    doc.deserializeChildSet('value', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = STYLE_PROPERTY
    typeRegistration.deserializer = StyleProperty.deserializer
    typeRegistration.childSets = {
      value: NodeCategory.StyleSheetPropertyValue,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.STYLE_PROPERTY, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'property'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(STYLE_PROPERTY, NodeCategory.StyleSheetProperty, new Generator())
  }
}
