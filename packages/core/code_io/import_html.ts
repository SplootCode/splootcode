import { SplootNode } from '../language/node'
import { SplootHtmlAttribute } from '../language/types/html/html_attribute'
import { SplootHtmlDocument } from '../language/types/html/html_document'
import { SplootHtmlElement } from '../language/types/html/html_element'
import { StringLiteral } from '../language/types/literals'
import { SplootHtmlScriptElement } from '../language/types/html/html_script_element'
import { parseJs } from './import_js'
import { JavascriptFile } from '../language/types/js/javascript_file'

function createScriptElement(domElement: Element): SplootHtmlScriptElement {
  const splootNode = new SplootHtmlScriptElement(null)
  domElement.childNodes.forEach((childNode: ChildNode) => {
    if (childNode.nodeType !== Node.TEXT_NODE) {
      console.warn('Found non-text node inside script tag??')
    } else {
      const jsNode = parseJs((childNode as Text).textContent) as JavascriptFile
      jsNode.getBody().children.forEach((node: SplootNode) => {
        splootNode.getContent().addChild(node)
      })
    }
  })
  const attrs = domElement.attributes
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs.item(i)
    // TODO: Detect if this should be a string, number or javascript node.
    const strLiteral = new StringLiteral(null, attr.value)
    const newAttrNode = new SplootHtmlAttribute(null, attr.name)
    newAttrNode.getValue().addChild(strLiteral)
    splootNode.getAttributes().addChild(newAttrNode)
  }
  return splootNode
}

function createDomElement(domElement: Element): SplootNode {
  switch (domElement.tagName.toLowerCase()) {
    case 'script':
      return createScriptElement(domElement)
    default:
      break
  }
  const splootNode = new SplootHtmlElement(null, domElement.tagName.toLowerCase())
  domElement.childNodes.forEach((childNode: ChildNode) => {
    const newNode = createNodeFromDomNode(childNode)
    if (newNode !== null) {
      splootNode.getContent().addChild(newNode)
    }
  })
  const attrs = domElement.attributes
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs.item(i)
    // TODO: Detect if this should be a string, number or javascript node.
    const strLiteral = new StringLiteral(null, attr.value)
    const newAttrNode = new SplootHtmlAttribute(null, attr.name)
    newAttrNode.getValue().addChild(strLiteral)
    splootNode.getAttributes().addChild(newAttrNode)
  }
  return splootNode
}

function createTextNode(textElement: Text): StringLiteral {
  if (textElement.textContent.trim().length === 0) {
    return null
  }
  const splootNode = new StringLiteral(null, textElement.textContent)
  return splootNode
}

function createNodeFromDomNode(domNode: ChildNode): SplootNode {
  switch (domNode.nodeType) {
    case Node.ELEMENT_NODE:
      return createDomElement(domNode as Element)
    case Node.TEXT_NODE:
      return createTextNode(domNode as Text)
    case Node.COMMENT_NODE:
      // TODO
      break
    default:
      console.log('Unknown node type: ', domNode)
  }
  return null
}

export function parseHtml(source: string): SplootNode {
  const parser = new DOMParser()
  const splootNode = new SplootHtmlDocument(null)
  const htmlDoc = parser.parseFromString(source, 'text/html')

  htmlDoc.childNodes.forEach((childNode: ChildNode) => {
    const newNode = createNodeFromDomNode(childNode)
    if (newNode !== null) {
      splootNode.getBody().addChild(newNode)
    }
  })

  return splootNode
}
