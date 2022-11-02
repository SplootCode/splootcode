import * as csstree from 'css-tree'

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
import { HTML_ElEMENT, SplootHtmlElement } from './html_element'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SplootHtmlAttribute } from './html_attribute'
import { StyleRule } from '../styles/style_rule'
import { isTagValidWithParent } from './tags'

export const HTML_STYLE_ELEMENT = 'HTML_STYLE_ELEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      if (isTagValidWithParent('style', (parent.node as SplootHtmlElement).getTag())) {
        return [
          new SuggestedNode(new SplootHtmlStyleElement(null), 'element style', 'style css', true, 'The style element.'),
        ]
      }
    }
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class SplootHtmlStyleElement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_STYLE_ELEMENT)
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.HtmlAttribute)
    this.addChildSet('content', ChildSetType.Many, NodeCategory.StyleSheetStatement)
  }

  getAttributes() {
    return this.getChildSet('attributes')
  }

  getContent() {
    return this.getChildSet('content')
  }

  generateHtmlElement(doc: Document): HTMLElement {
    const thisEl = doc.createElement('style')
    this.getAttributes().children.forEach((childNode) => {
      if (childNode.type === 'HTML_ATTRIBUTE') {
        const attrNode = childNode as SplootHtmlAttribute
        thisEl.setAttribute(attrNode.getName(), attrNode.generateCodeString())
      }
    })
    const cssStr = this.generateCSS()
    thisEl.appendChild(doc.createTextNode(cssStr))
    return thisEl
  }

  generateCodeString(): string {
    const doc = new DOMParser().parseFromString('<!DOCTYPE html>', 'text/html')
    const result = this.generateHtmlElement(doc)
    // @ts-ignore
    return new XMLSerializer().serializeToString(result, true)
  }

  generateCSS(): string {
    const ast = csstree.parse('')
    const stylesheet = ast as csstree.StyleSheet
    this.getContent().children.forEach((node) => {
      const cssNode = (node as StyleRule).getCssAst()
      stylesheet.children.push(cssNode)
    })
    return csstree.generate(stylesheet)
  }

  static deserializer(serializedNode: SerializedNode): SplootHtmlStyleElement {
    const doc = new SplootHtmlStyleElement(null)
    doc.deserializeChildSet('attributes', serializedNode)
    doc.deserializeChildSet('content', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = HTML_STYLE_ELEMENT
    typeRegistration.deserializer = SplootHtmlStyleElement.deserializer
    typeRegistration.childSets = {
      attributes: NodeCategory.HtmlAttribute,
      content: NodeCategory.StyleSheetStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'style'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(HTML_STYLE_ELEMENT, NodeCategory.DomNode)
    registerAutocompleter(NodeCategory.DomNode, new Generator())
  }
}
