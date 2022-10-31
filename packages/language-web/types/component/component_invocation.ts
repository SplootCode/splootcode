import * as recast from 'recast'

import { ChildSetType } from '@splootcode/core'
import { ComponentProperty } from './component_property'
import { ExpressionKind } from 'ast-types/gen/kinds'
import { HighlightColorCategory } from '@splootcode/core'
import { JavaScriptSplootNode } from '../../javascript_node'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '@splootcode/core'
import { NodeCategory, SuggestionGenerator, registerAutocompleter, registerNodeCateogry } from '@splootcode/core'
import { ParentReference, SplootNode } from '@splootcode/core'
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'
import { SuggestedNode } from '@splootcode/core'
import { VariableDefinition } from '@splootcode/language-web/definitions/loader'

export const COMPONENT_INVOCATION = 'COMPONENT_INVOCATION'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class ComponentInvocation extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, COMPONENT_INVOCATION)
    this.setProperty('name', name)
    this.addChildSet('attributes', ChildSetType.Many, NodeCategory.ComponentProperty)
    this.addChildSet('content', ChildSetType.Many, NodeCategory.Expression)
  }

  getName(): string {
    return this.getProperty('name')
  }

  getAttributes() {
    return this.getChildSet('attributes')
  }

  getPropertyDefinitions(): VariableDefinition[] {
    return []
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

    let callArguments: ExpressionKind[] = [recast.types.builders.identifier(this.getName())]
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

  static deserializer(serializedNode: SerializedNode): ComponentInvocation {
    const doc = new ComponentInvocation(null, serializedNode.properties.name)
    doc.deserializeChildSet('attributes', serializedNode)
    doc.deserializeChildSet('content', serializedNode)
    return doc
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = COMPONENT_INVOCATION
    typeRegistration.deserializer = ComponentInvocation.deserializer
    typeRegistration.childSets = {
      attributes: NodeCategory.ComponentProperty,
      content: NodeCategory.DomNode,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.HTML_ELEMENT, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TREE, 'attributes'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'content'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(COMPONENT_INVOCATION, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
