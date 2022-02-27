import * as csstree from 'css-tree'

import { ChildSetType } from '../../childset'
import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
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
import { STRING_LITERAL, StringLiteral } from '../literals'
import { SuggestedNode } from '../../suggested_node'

export const STYLE_SELECTOR_BASIC = 'STYLE_SELECTOR_BASIC'

const selectorTypes = {
  class: { astType: 'ClassSelector' },
  id: { astType: 'IdSelector' },
  element: { astType: 'TypeSelector' },
}

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const res = []
    for (const selectorType in selectorTypes) {
      res.push(
        new SuggestedNode(new StyleSelector(null, selectorType), 'selector-basic ' + selectorType, selectorType, true)
      )
    }
    return res
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class StyleSelector extends SplootNode {
  constructor(parentReference: ParentReference, selectorType: string) {
    super(parentReference, STYLE_SELECTOR_BASIC)
    this.setProperty('selectortype', selectorType)
    this.addChildSet('value', ChildSetType.Single, NodeCategory.HtmlAttributeValue)
  }

  getSelectorType(): string {
    return this.getProperty('selectortype')
  }

  getValue() {
    return this.getChildSet('value')
  }

  getValueAsString(): string {
    if (this.getValue().getCount() === 0) {
      return ''
    }
    const child = this.getValue().getChild(0)
    if (child.type === STRING_LITERAL) {
      return (child as StringLiteral).getValue()
    }
  }

  getSelectorListAst(): csstree.SelectorList {
    const astType = selectorTypes[this.getSelectorType()].astType
    const node = csstree.fromPlainObject({
      type: 'SelectorList',
      children: [
        {
          type: astType,
          name: this.getValueAsString(),
        },
      ],
    } as csstree.SelectorListPlain) as csstree.SelectorList
    return node
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

  static deserializer(serializedNode: SerializedNode): StyleSelector {
    const doc = new StyleSelector(null, serializedNode.properties['selectortype'])
    doc.deserializeChildSet('value', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = STYLE_SELECTOR_BASIC
    typeRegistration.deserializer = StyleSelector.deserializer
    typeRegistration.childSets = {
      value: NodeCategory.HtmlAttributeValue,
    }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.HTML_ATTRIBUTE,
      [
        new LayoutComponent(LayoutComponentType.PROPERTY, 'selectortype'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
      ],
      NodeBoxType.SMALL_BLOCK
    )

    registerType(typeRegistration)
    registerNodeCateogry(STYLE_SELECTOR_BASIC, NodeCategory.StyleSheetSelector)
    registerAutocompleter(NodeCategory.StyleSheetSelector, new Generator())
  }
}
