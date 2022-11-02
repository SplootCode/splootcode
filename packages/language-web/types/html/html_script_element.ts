import * as recast from 'recast'

import { ASTNode } from 'ast-types'
import {
  ChildSetType,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
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
import { ExpressionKind, StatementKind } from 'ast-types/gen/kinds'
import { HTML_ElEMENT, SplootHtmlElement } from './html_element'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'
import { SplootHtmlAttribute } from './html_attribute'
import { isTagValidWithParent } from './tags'

export const HTML_SCRIPT_ElEMENT = 'HTML_SCRIPT_ELEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (parent.node.type === HTML_ElEMENT) {
      if (isTagValidWithParent('script', (parent.node as SplootHtmlElement).getTag())) {
        return [
          new SuggestedNode(
            new SplootHtmlScriptElement(null),
            'element script',
            'script javascript',
            true,
            'The script element allows authors to include dynamic script and data blocks in their documents.'
          ),
        ]
      }
    }
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class SplootHtmlScriptElement extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, HTML_SCRIPT_ElEMENT)
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.HtmlAttribute)
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Statement)
  }

  getAttributes() {
    return this.getChildSet('attributes')
  }

  getContent() {
    return this.getChildSet('content')
  }

  generateHtmlElement(doc: Document): HTMLElement {
    const thisEl = doc.createElement('script')
    this.getAttributes().children.forEach((childNode) => {
      if (childNode.type === 'HTML_ATTRIBUTE') {
        const attrNode = childNode as SplootHtmlAttribute
        thisEl.setAttribute(attrNode.getName(), attrNode.generateCodeString())
      }
    })
    let jsString = recast.print(this.generateJsAst()).code
    // If we're in a script tag we need to escape this or it'll break.
    // We're hiding this problem because it's a very text parsing problem.
    // It might break some legit js, but only if you have a very odd regex
    // and it would've broken anyway without this hack.
    jsString = jsString.replace('</script>', '<\\/script>')
    thisEl.appendChild(doc.createTextNode(jsString))
    return thisEl
  }

  generateCodeString(): string {
    const doc = new DOMParser().parseFromString('<!DOCTYPE html>', 'text/html')
    const result = this.generateHtmlElement(doc)
    // @ts-ignore
    return new XMLSerializer().serializeToString(result, true)
  }

  generateJsAst(): ASTNode {
    const statements = []
    this.getContent().children.forEach((node: JavaScriptSplootNode) => {
      let result = null
      if (node.type === SPLOOT_EXPRESSION) {
        const expressionNode = node.generateJsAst() as ExpressionKind
        if (expressionNode !== null) {
          result = recast.types.builders.expressionStatement(expressionNode)
        }
      } else {
        result = node.generateJsAst() as StatementKind
      }
      if (result !== null) {
        statements.push(result)
      }
    })
    return recast.types.builders.program(statements)
  }

  clean() {
    this.getContent().children.forEach((child: SplootNode, index: number) => {
      if (child.type === SPLOOT_EXPRESSION) {
        if ((child as SplootExpression).getTokenSet().getCount() === 0) {
          this.getContent().removeChild(index)
        }
      }
    })
  }

  static deserializer(serializedNode: SerializedNode): SplootHtmlScriptElement {
    const doc = new SplootHtmlScriptElement(null)
    doc.deserializeChildSet('attributes', serializedNode)
    doc.deserializeChildSet('content', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = HTML_SCRIPT_ElEMENT
    typeRegistration.deserializer = SplootHtmlScriptElement.deserializer
    typeRegistration.childSets = {
      attributes: NodeCategory.HtmlAttribute,
      content: NodeCategory.DomNode,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'script'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(HTML_SCRIPT_ElEMENT, NodeCategory.DomNode)
    registerAutocompleter(NodeCategory.DomNode, new Generator())
  }
}
