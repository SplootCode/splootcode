import { SplootNode } from "@splootcode/core/language/node";
import { SplootHtmlAttribute } from "@splootcode/core/language/types/html/html_attribute";
import { SplootHtmlDocument } from "@splootcode/core/language/types/html/html_document";
import { SplootHtmlElement } from "@splootcode/core/language/types/html/html_element";
import { StringLiteral } from "@splootcode/core/language/types/literals";
import { SplootHtmlScriptElement } from "@splootcode/core/language/types/html/html_script_element";
import { parseJs } from "./import_js";
import { JavascriptFile } from "@splootcode/core/language/types/js/javascript_file";


function createScriptElement(domElement: Element) : SplootHtmlScriptElement {
  let splootNode = new SplootHtmlScriptElement(null);
  domElement.childNodes.forEach((childNode: ChildNode) => {
    if (childNode.nodeType !== Node.TEXT_NODE) {
      console.warn('Found non-text node inside script tag??');
    } else {
      let jsNode = parseJs((childNode as Text).textContent) as JavascriptFile;
      jsNode.getBody().children.forEach((node : SplootNode) => {
        splootNode.getContent().addChild(node);
      });
    }
  });
  let attrs = domElement.attributes;
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs.item(i);
    // TODO: Detect if this should be a string, number or javascript node.
    let strLiteral = new StringLiteral(null, attr.value);
    let newAttrNode = new SplootHtmlAttribute(null, attr.name);
    newAttrNode.getValue().addChild(strLiteral);
    splootNode.getAttributes().addChild(newAttrNode);
  }
  return splootNode;
}

function createDomElement(domElement: Element) : SplootNode{
  switch(domElement.tagName.toLowerCase()) {
    case 'script':
      return createScriptElement(domElement);
    default:
      break;
  }
  let splootNode = new SplootHtmlElement(null, domElement.tagName.toLowerCase());
  domElement.childNodes.forEach((childNode: ChildNode) => {
    let newNode = createNodeFromDomNode(childNode);
    if (newNode !== null) {
      splootNode.getContent().addChild(newNode);
    }
  });
  let attrs = domElement.attributes;
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs.item(i);
    // TODO: Detect if this should be a string, number or javascript node.
    let strLiteral = new StringLiteral(null, attr.value);
    let newAttrNode = new SplootHtmlAttribute(null, attr.name);
    newAttrNode.getValue().addChild(strLiteral);
    splootNode.getAttributes().addChild(newAttrNode);
  }
  return splootNode;
}

function createTextNode(textElement : Text) : StringLiteral {
  if (textElement.textContent.trim().length === 0) {
    return null;
  }
  let splootNode = new StringLiteral(null, textElement.textContent);
  return splootNode;
}


function createNodeFromDomNode(domNode: ChildNode) : SplootNode {
  switch(domNode.nodeType) {
    case Node.ELEMENT_NODE:
      return createDomElement(domNode as Element);
    case Node.TEXT_NODE:
      return createTextNode(domNode as Text);
    case Node.COMMENT_NODE:
      // TODO
      break;
    default:
      console.log('Unknown node type: ', domNode);
  }
  return null;
}


export function parseHtml(source: string) : SplootNode {
  var parser = new DOMParser();
  let splootNode = new SplootHtmlDocument(null);
  var htmlDoc = parser.parseFromString(source, 'text/html');
  
  htmlDoc.childNodes.forEach((childNode: ChildNode) => {
    let newNode = createNodeFromDomNode(childNode);
    if (newNode !== null) {
      splootNode.getBody().addChild(newNode);
    }
  });

  return splootNode;
}