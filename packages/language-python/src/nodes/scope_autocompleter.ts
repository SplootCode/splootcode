import { FunctionSignature, TypeCategory } from '../scope/types'
import {
  NodeCategory,
  ParentReference,
  SuggestedNode,
  SuggestionGenerator,
  registerAutocompleter,
} from '@splootcode/core'
import { PythonCallVariable } from './python_call_variable'
import { PythonFromImport } from './python_from_import'
import { PythonIdentifier } from './python_identifier'
import { PythonNode } from './python_node'

class ScopeAutocompleter implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number): SuggestedNode[] {
    // return []

    const scope = (parent.node as PythonNode).getScope()
    const inScopeVars = scope.getAllInScopeVariables()
    const suggestions = []
    for (const [name, entry] of inScopeVars.entries()) {
      const varName = name
      let varDoc = ''
      let funcMeta: FunctionSignature = null
      for (const varMetadata of entry.declarers.values()) {
        if (varMetadata.typeInfo?.category === TypeCategory.Function) {
          funcMeta = varMetadata.typeInfo
        } else if (varMetadata.typeInfo?.category === TypeCategory.ModuleAttribute) {
          const typeInfo = scope.getModuleAttributeTypeInfo(varMetadata.typeInfo.module, varMetadata.typeInfo.attribute)
          if (typeInfo?.category === TypeCategory.Function) {
            funcMeta = typeInfo
          } else if (typeInfo?.category === TypeCategory.Value) {
            varDoc = typeInfo.shortDoc || 'No documentation'
          }
        } else {
          varDoc = varMetadata.documentation || 'No documentation'
        }
      }
      if (entry.builtIn) {
        if (entry.builtIn.typeInfo?.category === TypeCategory.Function) {
          funcMeta = entry.builtIn.typeInfo
        } else {
          varDoc = entry.builtIn.documentation || 'No documentation'
        }
      }
      if (varDoc) {
        const newVar = new PythonIdentifier(null, varName)
        suggestions.push(new SuggestedNode(newVar, `${varName}`, varName, true, varDoc))
      }
      if (funcMeta) {
        const newCall = new PythonCallVariable(null, varName, funcMeta)
        const doc = funcMeta.shortDoc || 'No documentation'
        suggestions.push(new SuggestedNode(newCall, `${varName}`, varName, true, doc))
      }
    }
    return suggestions
  }
}

class AssignableSopeAutocompleter implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    const scope = (parent.node as PythonNode).getScope()
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
        suggestions.push(new SuggestedNode(newVar, `${varName}`, varName, true, varDoc))
      }
    }
    return suggestions
  }
}

class ModuleAttributeAutocompleter implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    // return []

    const importNode = parent.node as PythonFromImport
    const moduleName = importNode.getModuleName()
    if (moduleName) {
      const suggestions = []
      const scope = importNode.getScope()
      const moduleDef = scope.getModuleDefinition(moduleName)
      if (moduleDef) {
        for (const [varName, typeInfo] of moduleDef.attributes.entries()) {
          if (typeInfo.category === TypeCategory.Function) {
            // TODO: Add system for color-coding/tagging identifiers that are callable
            const newVar = new PythonIdentifier(null, varName)
            suggestions.push(new SuggestedNode(newVar, `${varName}`, varName, true, typeInfo.shortDoc))
          } else if (typeInfo.category === TypeCategory.Value) {
            const newVar = new PythonIdentifier(null, varName)
            suggestions.push(new SuggestedNode(newVar, `${varName}`, varName, true, typeInfo.shortDoc))
          }
        }
      }
      return suggestions
    }
    return []
  }
}

export function registerPythonAutocompleters() {
  registerAutocompleter(NodeCategory.PythonExpressionToken, new ScopeAutocompleter())
  registerAutocompleter(NodeCategory.PythonAssignable, new AssignableSopeAutocompleter())
  registerAutocompleter(NodeCategory.PythonModuleAttribute, new ModuleAttributeAutocompleter())
}
