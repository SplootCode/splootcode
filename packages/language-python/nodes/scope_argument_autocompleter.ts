import {
  NodeCategory,
  SuggestionGenerator,
  getAutocompleteRegistry,
} from '@splootcode/core/language/node_category_registry'
import { ParentReference } from '@splootcode/core/language/node'
import { PythonKeywordArgument } from './python_keyword_argument'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { sanitizeIdentifier } from './python_identifier'

function getInputBasedKwarg(textInput: string): SuggestedNode {
  let kwargName = sanitizeIdentifier(textInput)
  if (kwargName.length === 0 || (kwargName[0] <= '9' && kwargName[0] >= '0')) {
    kwargName = '_' + kwargName
  }

  const node = new PythonKeywordArgument(null, kwargName)
  const suggestedNode = new SuggestedNode(node, `${kwargName}=`, '', true, 'Keyword argument')
  return suggestedNode
}

class KeywordArgGenerator implements SuggestionGenerator {
  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    // TODO: get call expression and its type info to know what args/kwargs are available.
    // TODO: Prevent kwargs coming before args
    return [getInputBasedKwarg(textInput)]
  }
}

export function registerArgumentAutocompleters() {
  const registry = getAutocompleteRegistry()
  registry.registerSuggestionGenerator(NodeCategory.PythonFunctionArgumentValue, new KeywordArgGenerator())
}
