import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeBoxType,
  NodeCategory,
  NodeLayout,
  ParentReference,
  SerializedNode,
  SplootNode,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { HTML_ElEMENT, SplootHtmlElement } from './html_element'
import { HTML_SCRIPT_ElEMENT } from './html_script_element'
import { STRING_LITERAL, StringLiteral } from '../js/literals'
import { getValidAttributes } from './tags'

export const HTML_ATTRIBUTE = 'HTML_ATTRIBUTE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      return getValidAttributes((parent.node as SplootHtmlElement).getTag())
    } else if (parent.node.type === HTML_SCRIPT_ElEMENT) {
      return getValidAttributes('script')
    }
    return []
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string): Promise<SuggestedNode[]> {
    return []
  }
}

export class SplootHtmlAttribute extends SplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, HTML_ATTRIBUTE)
    this.setProperty('name', name)
    this.addChildSet('value', ChildSetType.Single, NodeCategory.HtmlAttributeValue)
  }

  getName(): string {
    return this.getProperty('name')
  }

  getValue() {
    return this.getChildSet('value')
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

  static deserializer(serializedNode: SerializedNode): SplootHtmlAttribute {
    const doc = new SplootHtmlAttribute(null, serializedNode.properties.name)
    doc.deserializeChildSet('value', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = HTML_ATTRIBUTE
    typeRegistration.deserializer = SplootHtmlAttribute.deserializer
    typeRegistration.childSets = {
      value: NodeCategory.HtmlAttributeValue,
    }
    typeRegistration.layout = new NodeLayout(
      HighlightColorCategory.HTML_ATTRIBUTE,
      [
        new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
        new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'value'),
      ],
      NodeBoxType.SMALL_BLOCK
    )

    registerType(typeRegistration)
    registerNodeCateogry(HTML_ATTRIBUTE, NodeCategory.HtmlAttribute)
    registerAutocompleter(NodeCategory.HtmlAttribute, new Generator())
  }
}
