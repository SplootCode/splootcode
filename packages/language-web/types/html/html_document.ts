import { ChildSetType } from '@splootcode/core'
import { DOMParser, XMLSerializer } from 'xmldom'
import { HTML_ElEMENT, SplootHtmlElement } from './html_element'
import { HighlightColorCategory } from '@splootcode/core'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, registerNodeCateogry } from '@splootcode/core'
import { ParentReference, SplootNode } from '@splootcode/core'
import { STRING_LITERAL, StringLiteral } from '../js/literals'

export const HTML_DOCUMENT = 'HTML_DOCUMENT'

export class SplootHtmlDocument extends SplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_DOCUMENT)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.DomNode)
  }

  getBody() {
    return this.getChildSet('body')
  }

  generateCodeString(): string {
    const doc = new DOMParser().parseFromString('<!DOCTYPE html>', 'text/html')
    this.getBody().children.forEach((child: SplootNode) => {
      if (child.type === HTML_ElEMENT) {
        const el = child as SplootHtmlElement
        doc.appendChild(el.generateHtmlElement(doc))
      }
      if (child.type === STRING_LITERAL) {
        const stringEl = child as StringLiteral
        doc.appendChild(doc.createTextNode(stringEl.getValue()))
      }
    })
    // @types/xmldom is wrong here. The boolean is for isHtml which affects the xml generation
    // in very significant ways.
    // @ts-ignore
    return new XMLSerializer().serializeToString(doc, true)
  }

  static deserializer(serializedNode: SerializedNode): SplootHtmlDocument {
    const doc = new SplootHtmlDocument(null)
    doc.deserializeChildSet('body', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = HTML_DOCUMENT
    typeRegistration.deserializer = SplootHtmlDocument.deserializer
    typeRegistration.properties = []
    typeRegistration.childSets = { body: NodeCategory.Statement }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.NONE, [
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(HTML_DOCUMENT, NodeCategory.HtmlDocument)
  }
}
