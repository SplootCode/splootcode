import * as recast from 'recast'

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
import { HTML_SCRIPT_ElEMENT, SplootHtmlScriptElement } from '../html/html_script_element'
import { JavaScriptSplootNode } from '../../javascript_node'
import { ObjectPropertyKind } from 'ast-types/gen/kinds'

export const JSS_HOVER_BLOCK = 'JSS_HOVER_BLOCK'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const sampleNode = new JssHoverBlock(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'hover', 'hover', true, 'Additional styles when hovering.')
    return [suggestedNode]
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class JssHoverBlock extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference) {
    super(parentReference, JSS_HOVER_BLOCK)
    this.addChildSet('body', ChildSetType.Many, NodeCategory.JssStyleProperties)
  }

  getBody() {
    return this.getChildSet('body')
  }

  generateJsAst(): ObjectPropertyKind {
    const key = recast.types.builders.stringLiteral('&:hover')
    const properties = this.getBody().children.map((node) => {
      return (node as JavaScriptSplootNode).generateJsAst() as ObjectPropertyKind
    })
    const value = recast.types.builders.objectExpression(properties)
    return recast.types.builders.objectProperty(key, value)
  }

  static deserializer(serializedNode: SerializedNode): JssHoverBlock {
    const node = new JssHoverBlock(null)
    node.deserializeChildSet('body', serializedNode)
    return node
  }

  static register() {
    const functionType = new TypeRegistration()
    functionType.typeName = JSS_HOVER_BLOCK
    functionType.deserializer = JssHoverBlock.deserializer
    functionType.hasScope = false
    functionType.properties = []
    functionType.childSets = { body: NodeCategory.JssStyleProperties }
    functionType.layout = new NodeLayout(HighlightColorCategory.FUNCTION_DEFINITION, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'hover'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'body'),
    ])
    functionType.pasteAdapters[HTML_SCRIPT_ElEMENT] = (node: SplootNode) => {
      const scriptEl = new SplootHtmlScriptElement(null)
      scriptEl.getContent().addChild(node)
      return scriptEl
    }

    registerType(functionType)
    registerNodeCateogry(JSS_HOVER_BLOCK, NodeCategory.JssBodyContent)
    registerNodeCateogry(JSS_HOVER_BLOCK, NodeCategory.JssStyleProperties)
    registerAutocompleter(NodeCategory.JssBodyContent, new Generator())
    registerAutocompleter(NodeCategory.JssStyleProperties, new Generator())
  }
}
