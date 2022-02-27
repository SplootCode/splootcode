import { FunctionSignature, TypeCategory } from '../../scope/types'
import { NodeCategory, SuggestionGenerator, registerAutocompleter } from '../../node_category_registry'
import { ParentReference } from '../../node'
import { PythonCallVariable } from './python_call_variable'
import { PythonIdentifier } from './python_identifier'
import { SuggestedNode } from '../../suggested_node'
import { VariableMetadata } from '../../scope/scope'

class ScopeAutocompleter implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    const scope = parent.node.getScope()
    const inScopeVars = scope.getAllInScopeVariables()

    const suggestions = []
    for (const [name, entry] of inScopeVars.entries()) {
      const varName = name
      let varDoc = ''
      let funcMeta: VariableMetadata = null

      for (const varMetadata of entry.declarers.values()) {
        if (varMetadata.typeInfo?.category === TypeCategory.Function) {
          funcMeta = varMetadata
        } else {
          varDoc = varMetadata.documentation || 'No documentation'
        }
      }
      if (entry.builtIn) {
        if (entry.builtIn.typeInfo?.category === TypeCategory.Function) {
          funcMeta = entry.builtIn
        } else {
          varDoc = entry.builtIn.documentation || 'No documentation'
        }
      }
      if (varDoc) {
        const newVar = new PythonIdentifier(null, varName)
        suggestions.push(new SuggestedNode(newVar, `var ${varName}`, varName, true, varDoc))
      }
      if (funcMeta) {
        const signature = funcMeta.typeInfo as FunctionSignature
        const newCall = new PythonCallVariable(null, varName, signature)
        const doc = funcMeta.documentation || 'No documentation'
        suggestions.push(new SuggestedNode(newCall, `call ${varName}`, varName, true, doc))
      }
    }

    return suggestions
  }
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string): SuggestedNode[] {
    return []
  }
}

class AssignableSopeAutocompleter implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = parent.node.getScope()
    const inScopeVars = scope.getAllInScopeVariables()
    const suggestions = []

    for (const [name, entry] of inScopeVars.entries()) {
      const varName = name
      let varDoc = ''
      for (const varMetadata of entry.declarers.values()) {
        if (varMetadata.typeInfo?.category !== TypeCategory.Function) {
          varDoc = varMetadata.documentation || 'No documentation'
        }
      }
      if (varDoc) {
        const newVar = new PythonIdentifier(null, varName)
        suggestions.push(new SuggestedNode(newVar, `var ${varName}`, varName, true, varDoc))
      }
    }
    return suggestions
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    return []
  }
}

export function registerPythonAutocompleters() {
  registerAutocompleter(NodeCategory.PythonExpressionToken, new ScopeAutocompleter())
  registerAutocompleter(NodeCategory.PythonAssignable, new AssignableSopeAutocompleter())
}
