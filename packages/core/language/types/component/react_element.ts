import * as recast from 'recast'

import { ChildSetType } from '../../childset'
import { ComponentProperty } from './component_property'
import { ExpressionKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '../../../colors'
import { JavaScriptSplootNode } from '../../javascript_node'
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
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'
import { SuggestedNode } from '../../suggested_node'
import { getValidReactElements } from '../../html/tags'

export const REACT_ELEMENT = 'REACT_ELEMENT'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    if (parent.node.type === REACT_ELEMENT) {
      return getValidReactElements((parent.node as ReactElementNode).getTag(), [])
    }
    // Assume all body elements are ok for react nodes.
    return getValidReactElements('body', [])
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class ReactElementNode extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, tag: string) {
    super(parentReference, REACT_ELEMENT)
    this.setProperty('tag', tag)
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.ComponentProperty)
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Expression)
  }

  getTag(): string {
    return this.getProperty('tag')
  }

  getAttributes() {
    return this.getChildSet('attributes')
  }

  getContent() {
    return this.getChildSet('content')
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

  generateJsAst(): ExpressionKind {
    const children = []
    this.getContent().children.forEach((node: JavaScriptSplootNode) => {
      const ast = node.generateJsAst() // Every node should (in theory) be a valid expression.
      if (ast !== null) {
        children.push(ast)
      }
    })

    let callArguments: ExpressionKind[] = [recast.types.builders.stringLiteral(this.getTag())]
    const props = recast.types.builders.objectExpression(
      this.getAttributes().children.map((node: SplootNode) => {
        return (node as ComponentProperty).generateJsAst()
      })
    )
    callArguments.push(props)
    callArguments = callArguments.concat(children)
    const reactIdentifier = recast.types.builders.identifier('React')
    const createElementIdentifier = recast.types.builders.identifier('createElement')
    const reactCreateElement = recast.types.builders.memberExpression(reactIdentifier, createElementIdentifier, false)
    return recast.types.builders.callExpression(reactCreateElement, callArguments)
  }

  static deserializer(serializedNode: SerializedNode): ReactElementNode {
    const doc = new ReactElementNode(null, serializedNode.properties.tag)
    doc.deserializeChildSet('attributes', serializedNode)
    doc.deserializeChildSet('content', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = REACT_ELEMENT
    typeRegistration.deserializer = ReactElementNode.deserializer
    typeRegistration.childSets = {
      attributes: NodeCategory.ComponentProperty,
      content: NodeCategory.DomNode,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'tag'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(REACT_ELEMENT, NodeCategory.ExpressionToken, new Generator())
  }
}
