import * as recast from 'recast'

import {
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
import { IdentifierKind } from 'ast-types/gen/kinds'
import { JavaScriptSplootNode } from '../../javascript_node'
import { SPLOOT_EXPRESSION, SplootExpression } from './expression'

export const VARIABLE_REFERENCE = 'VARIABLE_REFERENCE'

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

export class VariableReferenceGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const varName = sanitizeIdentifier(textInput)
    const newVar = new VariableReference(null, varName)
    if (varName.length === 0 || (varName[0] <= '9' && varName[0] >= '0')) {
      return []
    }

    const suggestedNode = new SuggestedNode(newVar, `var ${varName}`, '', false, 'undeclared variable')
    return [suggestedNode]
  }
}

export class VariableReference extends JavaScriptSplootNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, VARIABLE_REFERENCE)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  generateJsAst(): IdentifierKind {
    return recast.types.builders.identifier(this.getName())
  }

  static deserializer(serializedNode: SerializedNode): VariableReference {
    return new VariableReference(null, serializedNode.properties.identifier)
  }

  static register() {
    const varType = new TypeRegistration()
    varType.typeName = VARIABLE_REFERENCE
    varType.deserializer = VariableReference.deserializer
    varType.properties = ['identifier']
    varType.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])
    varType.pasteAdapters[SPLOOT_EXPRESSION] = (node: SplootNode) => {
      const exp = new SplootExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(varType)
    registerNodeCateogry(VARIABLE_REFERENCE, NodeCategory.ExpressionToken)
    registerAutocompleter(NodeCategory.ExpressionToken, new VariableReferenceGenerator())
  }
}
