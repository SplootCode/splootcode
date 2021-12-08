import * as csstree from 'css-tree';

import { ChildSetType } from "../../childset";
import { ParentReference } from "../../node";
import { NodeCategory, SuggestionGenerator, registerNodeCateogry } from "../../node_category_registry";
import { SuggestedNode } from "../../suggested_node";
import { LayoutComponent, LayoutComponentType, NodeLayout, registerType, SerializedNode, TypeRegistration } from "../../type_registry";
import { HighlightColorCategory } from "../../../colors";
import { isTagValidWithParent } from "../../html/tags";
import { HTML_ElEMENT, SplootHtmlElement } from "./html_element";
import { SplootHtmlAttribute } from "./html_attribute";
import { JavaScriptSplootNode } from "../../javascript_node";
import { StyleRule } from '../styles/style_rule';

export const HTML_STYLE_ELEMENT = 'HTML_STYLE_ELEMENT';

class Generator implements SuggestionGenerator {

  staticSuggestions(parent: ParentReference, index: number) : SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      if (isTagValidWithParent("style", (parent.node as SplootHtmlElement).getTag())) {
        return [new SuggestedNode(new SplootHtmlStyleElement(null), "element style", "style css", true, "The style element.")];
      }
    }
    return [];
  };

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) : SuggestedNode[] {
    return [];
  };
}

export class SplootHtmlStyleElement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_STYLE_ELEMENT);
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.HtmlAttribute);
    this.addChildSet('content', ChildSetType.Many, NodeCategory.StyleSheetStatement);
  }

  getAttributes() {
    return this.getChildSet('attributes');
  }

  getContent() {
    return this.getChildSet('content');
  }

  generateHtmlElement(doc: Document) : HTMLElement {
    let thisEl = doc.createElement('style');
    this.getAttributes().children.forEach((childNode) => {
      if (childNode.type === 'HTML_ATTRIBUTE') {
        let attrNode = childNode as SplootHtmlAttribute;
        thisEl.setAttribute(attrNode.getName(), attrNode.generateCodeString());
      }
    });
    let cssStr = this.generateCSS();
    thisEl.appendChild(doc.createTextNode(cssStr));
    return thisEl;
  }

  generateCodeString() : string {
    let doc = new DOMParser().parseFromString('<!DOCTYPE html>', 'text/html');
    let result = this.generateHtmlElement(doc);
    // @ts-ignore
    return new XMLSerializer().serializeToString(result, true);
  }

  generateCSS() : string {
    let ast = csstree.parse('');
    let stylesheet = ast as csstree.StyleSheet;
    this.getContent().children.forEach(node => {
      let cssNode = (node as StyleRule).getCssAst();
      stylesheet.children.push(cssNode);
    });
    return csstree.generate(stylesheet);
  }

  static deserializer(serializedNode: SerializedNode) : SplootHtmlStyleElement {
    let doc = new SplootHtmlStyleElement(null);
    doc.deserializeChildSet('attributes', serializedNode);
    doc.deserializeChildSet('content', serializedNode);
    return doc;
  }

  static register() {
    let typeRegistration = new TypeRegistration();
    typeRegistration.typeName = HTML_STYLE_ELEMENT;
    typeRegistration.deserializer = SplootHtmlStyleElement.deserializer;
    typeRegistration.childSets = {
      'attributes': NodeCategory.HtmlAttribute,
      'content': NodeCategory.StyleSheetStatement,
    };
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'style'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ]);

    registerType(typeRegistration);
    registerNodeCateogry(HTML_STYLE_ELEMENT, NodeCategory.DomNode, new Generator());
  }
}