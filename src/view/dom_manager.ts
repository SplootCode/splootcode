import { NodeMutation } from "../language/mutations/node_mutations";
import { SplootNode } from "../language/node";
import { SplootHtmlAttribute } from "../language/types/html/html_attribute";
import { SplootHtmlDocument } from "../language/types/html/html_document";
import { SplootHtmlElement } from "../language/types/html/html_element";
import { SplootHtmlScriptElement } from "../language/types/html/html_script_element";
import { StringLiteral } from "../language/types/literals";

import * as recast from "recast";

export class DomManager {

  constructor() { }

  loadNodeTree(nodeTree: SplootHtmlDocument) {
    renderTopLevelNode(nodeTree);
  }

  applyMutation(mutation: NodeMutation) {
    console.log('TODO apply mutation', mutation);
  }
}

function renderScriptElement(scriptNode: SplootHtmlScriptElement) : HTMLScriptElement {
  let el = document.createElement('script');
  scriptNode.getAttributes().children.forEach((childNode) => {
    if (childNode.type === 'HTML_ATTRIBUTE') {
      let attrNode = childNode as SplootHtmlAttribute;
      el.setAttribute(attrNode.getName(), getAttributeValue(attrNode.getValue().children[0]));
    }
  });
  let jsAst = scriptNode.generateJsAst();
  let src = recast.print(jsAst).code;
  el.appendChild(document.createTextNode(src));
  return el;
}

function renderDomElement(node: SplootHtmlElement) : HTMLElement {
  let el = document.createElement(node.properties.tag);
  node.getContent().children.forEach((childNode) => {
    let child = null;
    switch (childNode.type) {
      case 'HTML_ELEMENT':
        child = renderDomElement(childNode as SplootHtmlElement);
        break;
      case 'STRING_LITERAL':
        child = document.createTextNode((childNode as StringLiteral).getValue());
        break;
      case 'HTML_SCRIPT_ELEMENT':
        child = renderScriptElement((childNode as SplootHtmlScriptElement));
    }
    if (child !== null) {
      el.appendChild(child);
    }
  })
  node.getAttributes().children.forEach((childNode) => {
    if (childNode.type === 'HTML_ATTRIBUTE') {
      let attrNode = childNode as SplootHtmlAttribute;
      el.setAttribute(attrNode.getName(), getAttributeValue(attrNode.getValue().children[0]));
    }
  });
  return el;
}

function getAttributeValue(node: SplootNode) {
  if (node.type === 'STRING_LITERAL') {
    return (node as StringLiteral).getValue();
  }
  console.warn('Unrecognised attribute value type: ', node.type);
  return '';
}

function renderHead(node: any) {
  let dom = renderDomElement(node);
  let existingHead = document.getElementsByTagName('head')[0];
  existingHead.innerHTML = '';
  for (let i = 0; i < dom.children.length; i++) {
    existingHead.appendChild(dom.children[i].cloneNode());
  }
}

function renderBody(node: any) {
  let dom = renderDomElement(node);
  document.body = dom;
}

// htmldocument type
function renderDocument(node: SplootHtmlDocument) {
  let body = node.getBody();
  body.children.forEach((childNode: SplootNode) => {
    switch (childNode.type) {
      case 'HTML_ELEMENT':
        let elementNode = childNode as SplootHtmlElement;
        if (elementNode.getTag() === 'body') {
          renderBody(elementNode);
        } else if (elementNode.getTag() === 'head') {
          renderHead(elementNode);
        } else if (elementNode.getTag() === 'html') {
          elementNode.getContent().children.forEach((childNode: SplootNode) => {
            let elementNode = childNode as SplootHtmlElement;
            if (elementNode.type === 'HTML_ELEMENT') {
              if (elementNode.getTag() === 'body') {
                renderBody(elementNode);
              } else if (elementNode.getTag() === 'head') {
                renderHead(elementNode);
              }
            }
          });
        } else {
          // Clear
          document.body = document.createElement('body');
          let el = renderDomElement(elementNode);
          document.body.appendChild(el);
        }
        break;
      default:
        console.warn('Unrecognised type in document: ', childNode.type)   
    }
  });
}

// TODO proper typing of this object
function renderTopLevelNode(nodeTree: SplootHtmlDocument): void {
  renderDocument(nodeTree);
}