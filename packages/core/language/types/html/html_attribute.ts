import { ChildSetType } from '../../childset'
import { HTML_ElEMENT, SplootHtmlElement } from './html_element'
import { HTML_SCRIPT_ElEMENT } from './html_script_element'
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
import { getValidAttributes } from '../../html/tags'

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

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
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
      true
    )

    registerType(typeRegistration)
    registerNodeCateogry(HTML_ATTRIBUTE, NodeCategory.HtmlAttribute, new Generator())
  }
}
