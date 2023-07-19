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
import { PYTHON_EXPRESSION, PythonExpression } from './python_expression'

export const PYTHON_BINARY_OPERATOR = 'PYTHON_BINARY_OPERATOR'

const OPERATORS = {
  '*': { display: '*', key: '*', searchTerms: ['times', 'multiply', 'x', '*'], description: 'multiply' },
  '+': { display: '+', key: '+', searchTerms: ['add', 'plus'], description: 'add' },
  '-': { display: '-', key: '-', searchTerms: ['minus', 'subtract'], description: 'subtract' },
  description: 'minus',
  '/': { display: '/', key: '/', searchTerms: ['divide', 'divided by', 'division', '/'], description: 'divide' },
  '//': { display: '//', key: '//', searchTerms: ['integer divide', 'floor divide', '/'], description: 'integer divide' },
  '%': {
    display: '%',
    key: '%',
    searchTerms: ['modulo', 'remainder'],
    description: 'modulo (remainder when divided by)',
  },
  '==': { display: '==', key: '==', searchTerms: ['equals', 'equal', '=='], description: 'is equal to' },
  '!=': { display: '≠', key: '!=', searchTerms: ['not equals', 'equal', '!='], description: 'is not equal to' },
  is: { display: 'is', key: 'is', searchTerms: ['is'], description: 'is the same item' },
  'is not': { display: 'is not', key: 'is not', searchTerms: ['is not'], description: 'is not the same item' },
  in: { display: 'in', key: 'in', searchTerms: ['in'], description: 'is inside this list or set' },
  'not in': {
    display: 'not in',
    key: 'not in',
    searchTerms: ['not in'],
    description: 'is not inside this list or set',
  },
  and: { display: 'and', key: 'and', searchTerms: ['and', '&&'], description: 'both a AND b are true' },
  or: { display: 'or', key: 'or', searchTerms: ['or', '||'], description: 'either a OR b are true' },
  not: { display: 'not', key: 'not', searchTerms: ['not'], description: 'not' },
  '<': { display: '<', key: '<', searchTerms: ['less than'], description: 'is less than' },
  '<=': { display: '≤', key: '<=', searchTerms: ['less than equal'], description: 'is less than or equal to' },
  '>': { display: '>', key: '>', searchTerms: ['greater than'], description: 'is greater than' },
  '>=': { display: '≥', key: '>=', searchTerms: ['greater than equal'], description: 'is greater than or equal to' },
}

class BinaryOperatorGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const results = []
    for (const operator in OPERATORS) {
      const info = OPERATORS[operator]
      const node = new PythonBinaryOperator(null, operator)
      results.push(new SuggestedNode(node, info.key, info.searchTerms, true, info.description))
    }
    return results
  }
}

export class PythonBinaryOperator extends SplootNode {
  constructor(parentReference: ParentReference, operator: string) {
    super(parentReference, PYTHON_BINARY_OPERATOR)
    this.setProperty('operator', operator)
  }

  setOperator(operator: string) {
    this.setProperty('operator', operator)
  }

  getOperator(): string {
    return this.getProperty('operator')
  }

  static deserializer(serializedNode: SerializedNode): PythonBinaryOperator {
    const node = new PythonBinaryOperator(null, serializedNode.properties.operator)
    return node
  }

  getNodeLayout() {
    return new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.KEYWORD, OPERATORS[this.getOperator()].display),
    ])
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_BINARY_OPERATOR
    typeRegistration.deserializer = PythonBinaryOperator.deserializer
    typeRegistration.properties = ['operator']
    typeRegistration.childSets = {}
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.OPERATOR, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'operator'),
    ])
    typeRegistration.pasteAdapters[PYTHON_EXPRESSION] = (node: SplootNode) => {
      const exp = new PythonExpression(null)
      exp.getTokenSet().addChild(node)
      return exp
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_BINARY_OPERATOR, NodeCategory.PythonExpressionToken)
    registerAutocompleter(NodeCategory.PythonExpressionToken, new BinaryOperatorGenerator())
  }
}
