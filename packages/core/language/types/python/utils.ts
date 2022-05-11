import { AssignmentAnnotation, ReturnValueAnnotation } from '../../annotations/annotations'
import { PYTHON_BINARY_OPERATOR, PythonBinaryOperator } from './python_binary_operator'
import { SplootNode } from '../../node'

export function formatPythonData(value: string, type: string): string {
  switch (type) {
    case 'str':
      return `"${value}" (str)`
    case 'bool':
    case 'NoneType':
      return value
    default:
      return `${value} (${type})`
  }
}

export function formatPythonReturnValue(value: ReturnValueAnnotation): string {
  return `→ ${formatPythonData(value.value, value.type)}`
}

export function formatPythonAssingment(value: AssignmentAnnotation): string {
  return `${value.variableName} = ${formatPythonData(value.value, value.type)}`
}

const UnaryOperators = {
  not: { precedence: 70 },
  '+': { precedence: 150 },
  '-': { precedence: 150 },
  '~': { precedence: 150 }, // Bitwise not
}

const BinaryOperators = {
  or: { precedence: 50 },
  and: { precedence: 60 },
  '==': { precedence: 80 },
  '!=': { precedence: 80 },
  '>=': { precedence: 80 },
  '>': { precedence: 80 },
  '<=': { precedence: 80 },
  '<': { precedence: 80 },
  'is not': { precedence: 80 },
  is: { precedence: 80 },
  'not in': { precedence: 80 },
  in: { precedence: 80 },
  '|': { precedence: 90 },
  '^': { precedence: 100 },
  '&': { precedence: 110 },
  '<<': { precedence: 120 },
  '>>': { precedence: 120 },
  '+': { precedence: 130 },
  '-': { precedence: 130 },
  '*': { precedence: 140 },
  '/': { precedence: 140 },
  '//': { precedence: 140 },
  '%': { precedence: 140 },
  '@': { precedence: 140 },
  '**': { precedence: 160 },
}

function parseLeaf(tokens: SplootNode[], currentIndex: number): [boolean, number] {
  if (currentIndex >= tokens.length) {
    // No tokens left when a leaf was expected
    return [false, currentIndex]
  }
  const lookahead = tokens[currentIndex]
  if (lookahead.type === PYTHON_BINARY_OPERATOR) {
    const op = (lookahead as PythonBinaryOperator).getOperator()
    if (op in UnaryOperators) {
      const [valid, leafIndex] = parseLeaf(tokens, currentIndex + 1)
      if (!valid) {
        return [false, leafIndex]
      }
      return parseExpression(tokens, leafIndex, UnaryOperators[op]['precedence'])
    }
    return [false, currentIndex]
  }
  // Consume one token - whatever it was it wasn't an operator
  return [true, currentIndex + 1]
}

function parseExpression(tokens: SplootNode[], currentIndex: number, minPrecedence: number): [boolean, number] {
  if (currentIndex >= tokens.length) {
    // Ran out of tokens
    return [true, currentIndex]
  }

  let lookahead = tokens[currentIndex]
  while (
    lookahead &&
    lookahead.type === PYTHON_BINARY_OPERATOR &&
    BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()] &&
    BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()].precedence >= minPrecedence
  ) {
    const operator = (lookahead as PythonBinaryOperator).getOperator()
    const precedence = BinaryOperators[operator].precedence
    currentIndex += 1
    let valid = false
    ;[valid, currentIndex] = parseLeaf(tokens, currentIndex)
    if (!valid) {
      // Leaf RHS was invalid
      return [false, currentIndex]
    }
    if (currentIndex === tokens.length) {
      return [true, currentIndex]
    }

    lookahead = tokens[currentIndex]
    while (
      lookahead &&
      lookahead.type === PYTHON_BINARY_OPERATOR &&
      BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()] &&
      BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()].precedence > precedence
    ) {
      const secondOp = (lookahead as PythonBinaryOperator).getOperator()
      const secondPrecedence = BinaryOperators[secondOp].precedence
      let exprValid = false
      ;[exprValid, currentIndex] = parseExpression(tokens, currentIndex, secondPrecedence)
      if (!exprValid) {
        // Invalid secondary parse
        return [false, currentIndex]
      }
      if (currentIndex < tokens.length) {
        lookahead = tokens[currentIndex]
      } else {
        lookahead = null
      }
    }
  }
  // Have parsed all valid operators
  return [true, currentIndex]
}

export function validateExpressionParse(tokens: SplootNode[]): [boolean, number] {
  const [valid, index] = parseLeaf(tokens, 0)
  if (!valid) {
    // No valid leaf at the start
    return [false, 0]
  }
  const [isValid, finalIndex] = parseExpression(tokens, index, 0)
  return [isValid && finalIndex === tokens.length, finalIndex]
}
