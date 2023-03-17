import { FunctionArgType, TypeCategory, VariableTypeInfo } from '../scope/types'
import {
  NodeCategory,
  ParentReference,
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
import { TypeCategory as TC, Type } from 'structured-pyright'

function getAttributesForType(scope: PythonScope, typeName: string): [string, VariableTypeInfo][] {
  const typeMeta = scope.getTypeDefinition(typeName)
  if (typeMeta) {
    return Array.from(typeMeta.attributes.entries())
  }
  console.warn('No type found for type name: ', typeName)
  return []
}

function getAttributesForModule(scope: PythonScope, moduleName: string): [string, VariableTypeInfo][] {
  const typeMeta = scope.getModuleDefinition(moduleName)
  if (typeMeta) {
    return Array.from(typeMeta.attributes.entries())
  }
  console.warn('No definition found for module name: ', moduleName)
  return []
}

function getAttributesFromType(scope: PythonScope, type: Type): [string, VariableTypeInfo][] {
  if (!type) {
    return []
  }

  switch (type.category) {
    case TC.Class:
      console.log(type.details.fields)
      return getAttributesForType(scope, type.details.fullName)
    case TC.Module:
      return getAttributesForModule(scope, type.moduleName)
    case TC.Union:
      return type.subtypes.map((subtype) => getAttributesFromType(scope, subtype)).flat()
  }
  return []
}

class MemberGenerator implements SuggestionGenerator {
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // need dynamic suggestions for when we can't infer the type.
    const leftChild = parent.getChildSet().getChild(index - 1)
    const scope = (parent.node as PythonNode).getScope(false)
    const filePath = scope.getFilePath()
    let attributes: [string, VariableTypeInfo][] = []
    let allowWrap = false

    const analyzer = scope.getAnalyzer()

    if (leftChild) {
      allowWrap = true
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
          const typeResult = analyzer.getPyrightTypeForExpression(filePath, leftChild)
          if (typeResult) {
            attributes = getAttributesFromType(scope, typeResult)
          } else {
            attributes = []
          }
          break
        default:
          break
      }
    }

    const inputName = textInput.substring(1) // Cut the '.' off

    if (attributes.length === 0) {
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
          allowWrap ? 'object' : undefined
        ),
        new SuggestedNode(
          memberNode,
          `.${inputName}`,
          inputName,
          true,
          'Missing type information, cannot autocomplete attributes',
          allowWrap ? 'object' : undefined
        ),
      ]
    }

    const allowUnderscore = textInput.startsWith('._')
    const suggestions = []
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
