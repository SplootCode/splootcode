import * as recast from 'recast'

import { ExpressionKind } from 'ast-types/gen/kinds'
import {
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
import { JavaScriptSplootNode } from '../../javascript_node'
import { LOCAL_STYLES_IDENTIFIER } from './jss_style_block'

export const JSS_CLASS_REFERENCE = 'JSS_CLASS_REFERENCE'

class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

export class JssClassReference extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, JSS_CLASS_REFERENCE)
    this.setProperty('name', name)
  }

  getIdentifier() {
    return this.getProperty('name')
  }

  generateJsAst(): ExpressionKind {
    const styles = recast.types.builders.identifier(LOCAL_STYLES_IDENTIFIER)
    const classes = recast.types.builders.memberExpression(styles, recast.types.builders.identifier('classes'))
    const classNameIdentifier = recast.types.builders.identifier(this.getIdentifier())
    return recast.types.builders.memberExpression(classes, classNameIdentifier)
  }

  static deserializer(serializedNode: SerializedNode): JssClassReference {
    const node = new JssClassReference(null, serializedNode.properties.name)
    return node
  }

  static register() {
    const functionType = new TypeRegistration()
    functionType.typeName = JSS_CLASS_REFERENCE
    functionType.deserializer = JssClassReference.deserializer
    functionType.hasScope = false
    functionType.properties = ['name']
    functionType.childSets = {}
    functionType.layout = new NodeLayout(HighlightColorCategory.STYLE_RULE, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'class'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'name'),
    ])

    registerType(functionType)
    registerNodeCateogry(JSS_CLASS_REFERENCE, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
