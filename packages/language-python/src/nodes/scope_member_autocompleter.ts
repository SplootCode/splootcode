import { AutocompleteEntryCategory, AutocompleteInfo, ExpressionTypeResponse } from '../analyzer/python_analyzer'
import { FunctionArgType, TypeCategory, VariableTypeInfo } from '../scope/types'
import {
  NodeCategory,
  ParentReference,
  SplootNode,
  SuggestedNode,
  SuggestionGenerator,
  getAutocompleteRegistry,
} from '@splootcode/core'

import { PYTHON_BRACKETS } from './python_brackets'
import { PYTHON_CALL_MEMBER, PythonCallMember } from './python_call_member'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_DICT } from './python_dictionary'
import { PYTHON_IDENTIFIER } from './python_identifier'
import { PYTHON_LIST } from './python_list'
import { PYTHON_MEMBER, PythonMember } from './python_member'
import { PYTHON_NUMBER_LITERAL } from './literals'
import { PYTHON_SET } from './python_set'
import { PYTHON_STRING } from './python_string'
import { PYTHON_SUBSCRIPT } from './python_subscript'
import { PYTHON_TUPLE } from './python_tuple'
import { PythonNode } from './python_node'
import { PythonScope } from '../scope/python_scope'

function getAttributesForType(scope: PythonScope, typeName: string): [string, VariableTypeInfo][] {
  const typeMeta = scope.getTypeDefinition(typeName)
  if (typeMeta) {
    return Array.from(typeMeta.attributes.entries())
  }
  console.warn('No type found for type name: ', typeName)
  return []
}

class MemberGenerator implements SuggestionGenerator {
  autocompleteCache: {
    parentReference: ParentReference
    index: number
    leftChild: SplootNode
    attributes: [string, VariableTypeInfo][]
  }

  constructor() {
    this.autocompleteCache = null
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // need dynamic suggestions for when we can't infer the type.
    const leftChild = parent.getChildSet().getChild(index - 1)

    let attributes: [string, VariableTypeInfo][] = []
    if (
      this.autocompleteCache &&
      this.autocompleteCache.leftChild === leftChild &&
      this.autocompleteCache.parentReference === parent &&
      this.autocompleteCache.index === index
    ) {
      attributes = this.autocompleteCache.attributes
    } else {
      const scope = (parent.node as PythonNode).getScope(false)
      const filePath = scope.getFilePath()
      const autocompletes: AutocompleteInfo[] = []

      const analyzer = scope.getAnalyzer()

      if (leftChild) {
        switch (leftChild.type) {
          case PYTHON_STRING:
            attributes = getAttributesForType(scope, 'builtins.str')
            break
          case PYTHON_LIST:
            attributes = getAttributesForType(scope, 'builtins.list')
            break
          case PYTHON_TUPLE:
            attributes = getAttributesForType(scope, 'builtins.tuple')
            break
          case PYTHON_DICT:
            attributes = getAttributesForType(scope, 'builtins.dict')
            break
          case PYTHON_SET:
            attributes = getAttributesForType(scope, 'builtins.set')
            break
          case PYTHON_NUMBER_LITERAL:
            attributes = getAttributesForType(scope, 'builtins.int')
            break
          case PYTHON_IDENTIFIER:
          case PYTHON_CALL_MEMBER:
          case PYTHON_CALL_VARIABLE:
          case PYTHON_SUBSCRIPT:
          case PYTHON_BRACKETS:
          case PYTHON_MEMBER:
            let info: ExpressionTypeResponse = null
            try {
              info = await analyzer.getExpressionType(filePath, leftChild)
            } catch (e) {
              console.warn('unable to get type', e)
            }

            if (info) {
              autocompletes.push(...info.autocompleteSuggestions)
            }

            console.log('got', info)
            break
          default:
            console.error('invalid type for autocomplete', leftChild)
        }
      }

      const newAttributes = autocompletes.map((info): [string, VariableTypeInfo] => {
        let type: VariableTypeInfo = null
        if (info.category === AutocompleteEntryCategory.Value) {
          type = {
            category: TypeCategory.Value,
            typeName: null,
            shortDoc: info.shortDoc,
            typeIfAttr: info.typeIfAttr,
          }

          return [info.name, type]
        } else if (info.category === AutocompleteEntryCategory.Function) {
          type = {
            category: TypeCategory.Function,
            arguments: info.arguments.map((arg) => {
              return {
                name: arg.name,
                type: arg.type,
                defaultValue: arg.hasDefault ? 'None' : undefined,
              }
            }),
            shortDoc: info.shortDoc,
            typeIfMethod: info.typeIfMethod,
          }

          return [info.name, type]
        }
      })

      attributes = attributes.concat(newAttributes)
    }

    this.autocompleteCache = {
      parentReference: parent,
      index: index,
      leftChild: leftChild,
      attributes: attributes,
    }

    const inputName = textInput.substring(1) // Cut the '.' off
    if (attributes.length == 0) {
      const callMemberNode = new PythonCallMember(null, {
        category: TypeCategory.Function,
        arguments: [{ name: '', type: FunctionArgType.PositionalOrKeyword }],
        shortDoc: '',
      })
      callMemberNode.setMember(inputName)
      const memberNode = new PythonMember(null, {
        category: TypeCategory.Value,
        typeName: null,
        shortDoc: '',
      })
      memberNode.setMember(inputName)
      return [
        new SuggestedNode(
          callMemberNode,
          `.${inputName}`,
          inputName,
          true,
          'Missing type information, cannot autocomplete methods',
          'object'
        ),
        new SuggestedNode(
          memberNode,
          `.${inputName}`,
          inputName,
          true,
          'Missing type information, cannot autocomplete attributes',
          'object'
        ),
      ]
    }

    const suggestions: SuggestedNode[] = []
    const allowUnderscore = textInput.startsWith('._')

    const seen = new Set<string>()
    for (const [name, attr] of attributes) {
      if (seen.has(name)) {
        continue
      }
      seen.add(name)

      if (attr.category === TypeCategory.Function) {
        if (!name.startsWith('_') || allowUnderscore) {
          const node = new PythonCallMember(null, attr)
          node.setMember(name)
          suggestions.push(new SuggestedNode(node, `.${name}`, name, true, attr.shortDoc, 'object'))
        }
      } else if (attr.category === TypeCategory.Value) {
        if (!name.startsWith('_') || allowUnderscore) {
          const node = new PythonMember(null, attr)
          node.setMember(name)
          suggestions.push(new SuggestedNode(node, `.${name}`, name, true, attr.shortDoc, 'object'))
        }
      }
    }

    return suggestions
  }
}

export function registerMemberAutocompleters() {
  const registry = getAutocompleteRegistry()
  registry.registerPrefixOverride('.', NodeCategory.PythonExpressionToken, new MemberGenerator())
}
