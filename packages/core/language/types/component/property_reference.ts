import * as recast from 'recast'

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
import { MemberExpressionKind } from 'ast-types/gen/kinds'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { ParentReference, SplootNode } from '../../node'
import { SPLOOT_EXPRESSION, SplootExpression } from '../js/expression'

export const PROPERTY_REFERENCE = 'PROPERTY_REFERENCE'

export function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d]/g, ' ')
  // Only sanitise the variable name if it contains space or punctuation.
  if (textInput.indexOf(' ') !== -1) {
    // From SO: https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
    return textInput
      .split(' ')
      .map(function (word, index) {
        // If it is the first word make sure to lowercase all the chars.
        if (index == 0) {
          return word.toLowerCase()
        }
        // If it is not the first word only upper case the first char and lowercase the rest.
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join('')
  }
  return textInput
}

export class Generator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    // Property autocomplete has been deprecated.
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // TODO: Generate new properties - but only when inside a component scope.
    return []
  }
}

export class PropertyReference extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PROPERTY_REFERENCE)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  generateJsAst(): MemberExpressionKind {
    const identifier = recast.types.builders.identifier(this.getName())
    const prop = recast.types.builders.identifier('props')
    return recast.types.builders.memberExpression(prop, identifier)
  }

  static deserializer(serializedNode: SerializedNode): PropertyReference {
    return new PropertyReference(null, serializedNode.properties.identifier)
  }

  static register() {
    const varType = new TypeRegistration()
    varType.typeName = PROPERTY_REFERENCE
    varType.deserializer = PropertyReference.deserializer
    varType.properties = ['identifier']
    varType.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'prop'),
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])
    varType.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(varType)
    registerNodeCateogry(PROPERTY_REFERENCE, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new Generator())
  }
}
