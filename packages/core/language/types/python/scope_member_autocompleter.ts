import { FunctionArgType, TypeCategory, VariableTypeInfo } from '../../scope/types'
import { NUMERIC_LITERAL, STRING_LITERAL } from '../literals'
import { NodeCategory, SuggestionGenerator, getAutocompleRegistry } from '../../node_category_registry'
import { PYTHON_BOOL } from './literals'
import { PYTHON_CALL_MEMBER, PythonCallMember } from './python_call_member'
import { PYTHON_CALL_VARIABLE } from './python_call_variable'
import { PYTHON_DICT } from './python_dictionary'
import { PYTHON_IDENTIFIER } from './python_identifier'
import { PYTHON_LIST } from './python_list'
import { PYTHON_SUBSCRIPT } from './python_subscript'
import { ParentReference } from '../../node'
import { PythonMember } from './python_member'
import { Scope } from '../../scope/scope'
import { SuggestedNode } from '../../autocomplete/suggested_node'
import { TypeCategory as TC, TypeResult } from 'sploot-checker'

function getAttributesForType(scope: Scope, typeName: string): [string, VariableTypeInfo][] {
  const typeMeta = scope.getTypeDefinition(typeName)
  if (typeMeta) {
    return Array.from(typeMeta.attributes.entries())
  }
  console.warn('No type found for type name: ', typeName)
  return []
}

function getAttributeFromTypeResult(scope: Scope, typeResult: TypeResult): [string, VariableTypeInfo][] {
  if (!typeResult) {
    return []
  }
  const t = typeResult.type
  switch (t.category) {
    case TC.Class:
      return getAttributesForType(scope, t.details.fullName)
  }
  return []
}

class MemberGenerator implements SuggestionGenerator {
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // need dynamic suggestions for when we can't infer the type.
    const leftChild = parent.getChildSet().getChild(index - 1)
    const scope = parent.node.getScope(false)
    let attributes: [string, VariableTypeInfo][] = []
    let allowWrap = false

    const analyzer = scope.getAnalyzer()

    if (
      leftChild &&
      [
        PYTHON_IDENTIFIER,
        PYTHON_CALL_MEMBER,
        STRING_LITERAL,
        PYTHON_BOOL,
        NUMERIC_LITERAL,
        PYTHON_CALL_VARIABLE,
        PYTHON_LIST,
        PYTHON_SUBSCRIPT,
        PYTHON_DICT,
      ].indexOf(leftChild.type) !== -1
    ) {
      allowWrap = true
      switch (leftChild.type) {
        case STRING_LITERAL:
          attributes = getAttributesForType(scope, 'builtins.str')
          break
        case PYTHON_LIST:
          attributes = getAttributesForType(scope, 'builtins.list')
          break
        case PYTHON_DICT:
          attributes = getAttributesForType(scope, 'builtins.dict')
          break
        case NUMERIC_LITERAL:
          attributes = getAttributesForType(scope, 'builtins.int')
          break
        case PYTHON_IDENTIFIER:
        case PYTHON_CALL_MEMBER:
        case PYTHON_CALL_VARIABLE:
          const typeResult = analyzer.getPyrightTypeForExpression(leftChild)
          if (typeResult) {
            attributes = getAttributeFromTypeResult(scope, typeResult)
          } else {
            attributes = []
          }
          break
        default:
          // TODO: Detect type for subscript, call var, call member
          break
      }
    }

    const inputName = textInput.substring(1) // Cut the '.' off

    if (attributes.length === 0) {
      const node = new PythonCallMember(null, {
        category: TypeCategory.Function,
        arguments: [{ name: '', type: FunctionArgType.PositionalOrKeyword }],
        shortDoc: '',
      })
      node.setMember(inputName)
      return [
        new SuggestedNode(
          node,
          `callmember ${inputName}`,
          inputName,
          true,
          'Missing type information, cannot autocomplete methods',
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
          suggestions.push(new SuggestedNode(node, `callmember ${name}`, name, true, attr.shortDoc, 'object'))
        }
      } else if (attr.category === TypeCategory.Value)
        if (!name.startsWith('_') || allowUnderscore) {
          {
            const node = new PythonMember(null)
            node.setMember(name)
            suggestions.push(new SuggestedNode(node, `member ${name}`, name, true, attr.shortDoc, 'object'))
          }
        }
    }

    return suggestions
  }
}

export function registerMemberAutocompleters() {
  const registry = getAutocompleRegistry()
  registry.registerPrefixOverride('.', NodeCategory.PythonExpressionToken, new MemberGenerator())
}
