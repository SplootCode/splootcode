import { FunctionParameter, ParameterCategory } from 'structured-pyright'
import {
  NodeCategory,
  ParentReference,
  SuggestedNode,
  SuggestionGenerator,
  getAutocompleteRegistry,
} from '@splootcode/core'
import { PYTHON_KEWORD_ARGUMENT, PythonKeywordArgument } from './python_keyword_argument'
import { PythonArgument } from './python_argument'
import { PythonCallVariable } from './python_call_variable'
import { sanitizeIdentifier } from './python_identifier'

function getInputBasedKwargs(textInput: string): SuggestedNode[] {
  textInput = textInput.split('=')[0]
  const kwargName = sanitizeIdentifier(textInput)
  if (kwargName.length === 0 || (kwargName[0] <= '9' && kwargName[0] >= '0')) {
    return []
  }

  const node = new PythonKeywordArgument(null, kwargName)
  const suggestedNode = new SuggestedNode(node, `${kwargName}=`, '=', true, 'Keyword argument')
  return [suggestedNode]
}

export interface AvailableFunctionArguments {
  positionalOnly: FunctionParameter[]
  positionalOrKeyword: FunctionParameter[]
  vargsName: null | string
  keywordOnly: FunctionParameter[]
  kwargsName: null | string
}

function getAvailableFunctionArgs(callNode: PythonCallVariable, argNode: PythonArgument): AvailableFunctionArguments[] {
  const argList = callNode.getArguments().children as PythonArgument[]
  const argIndex = argList.indexOf(argNode)
  const scope = callNode.getScope(false)
  const filePath = scope.filePath
  const analyzer = scope.getAnalyzer()
  const callInfo = analyzer.getPyrightFunctionSignature(filePath, callNode, argIndex)
  if (!callInfo) {
    return null
  }

  const results = []
  for (const signature of callInfo.signatures) {
    const params = signature.type.details.parameters
    const availableArgs: AvailableFunctionArguments = {
      positionalOnly: [],
      positionalOrKeyword: [],
      vargsName: null,
      keywordOnly: [],
      kwargsName: null,
    }
    if (params.length === 0) {
      results.push(availableArgs)
      continue
    }

    // Cut off first params
    const firstNonSimpleParam = params.findIndex((param) => param.category !== ParameterCategory.Simple)
    const numSimple = firstNonSimpleParam === -1 ? params.length : firstNonSimpleParam
    availableArgs.vargsName =
      firstNonSimpleParam !== -1 && params[firstNonSimpleParam].category === ParameterCategory.VarArgList
        ? params[firstNonSimpleParam].name
        : null
    availableArgs.kwargsName =
      params[params.length - 1].category === ParameterCategory.VarArgDictionary ? params[params.length - 1].name : null

    // First get remaining positional args
    const firstKeywordIndex = argList.findIndex((argNode) => argNode.argType() === PYTHON_KEWORD_ARGUMENT)
    const numPositional = firstKeywordIndex === -1 ? argList.length - 1 : firstKeywordIndex
    const usedKeywords = argList
      .filter((argNode) => argNode.argType() === PYTHON_KEWORD_ARGUMENT)
      .map((arg) => (arg.getArgument().getChild(0) as PythonKeywordArgument).getName())

    if (numSimple > numPositional) {
      const remainingSimple = params.slice(numPositional, numSimple)
      availableArgs.positionalOnly = remainingSimple.filter((param) => param.name && param.name.startsWith('_'))
      availableArgs.positionalOrKeyword = remainingSimple.filter(
        (param) => param.name && !param.name.startsWith('_') && !usedKeywords.includes(param.name)
      )
    }

    if (firstNonSimpleParam !== -1) {
      availableArgs.keywordOnly = params
        .slice(firstNonSimpleParam)
        .filter((param) => param.category === ParameterCategory.Simple && !usedKeywords.includes(param.name))
    }
    results.push(availableArgs)
  }
  return results
}

class KeywordArgGenerator implements SuggestionGenerator {
  staticSuggestions(parent: ParentReference, index: number) {
    return []
  }

  async dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const argNode = parent.node as PythonArgument
    if (!argNode.allowKeyword()) {
      return []
    }
    const scope = argNode.getScope(false)
    const path = scope.getFilePath()
    const analyzer = scope.getAnalyzer()

    const callNode = argNode.parent.node as PythonCallVariable
    const argIndex = callNode.getArguments().getIndexOf(argNode)
    const callInfo = analyzer.getPyrightFunctionSignature(path, callNode, argIndex)
    if (!callInfo) {
      return getInputBasedKwargs(textInput)
    }

    const availableArgs = getAvailableFunctionArgs(callNode, argNode)

    const keywords: Set<string> = new Set()
    for (const args of availableArgs) {
      const allAvailable = [...args.positionalOrKeyword, ...args.keywordOnly]
      for (const param of allAvailable) {
        keywords.add(param.name)
      }
    }

    const suggestions = [...keywords].map((paramName) => {
      const node = new PythonKeywordArgument(null, paramName)
      const suggestedNode = new SuggestedNode(node, `${paramName}=`, '=', true, 'Keyword argument')
      return suggestedNode
    })

    for (const args of availableArgs) {
      if (args.kwargsName) {
        suggestions.push(...getInputBasedKwargs(textInput))
        break
      }
    }

    return suggestions
  }
}

export function registerArgumentAutocompleters() {
  const registry = getAutocompleteRegistry()
  registry.registerSuggestionGenerator(NodeCategory.PythonFunctionArgumentValue, new KeywordArgGenerator())
}
