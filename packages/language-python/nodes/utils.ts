import { AssignmentAnnotation, ReturnValueAnnotation } from '@splootcode/core/language/annotations/annotations'
import {
  BinaryOperationNode,
  ErrorExpressionCategory,
  ErrorNode,
  ExpressionNode,
  OperatorType,
  ParseNodeType,
  TokenType,
  UnaryOperationNode,
} from 'structured-pyright'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonBinaryOperator } from './python_binary_operator'
import { PythonNode } from './python_node'
import { SplootNode } from '@splootcode/core/language/node'

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
  not: { precedence: 70, type: OperatorType.Not, tokenType: TokenType.Keyword },
  '+': { precedence: 150, type: OperatorType.Add, tokenType: TokenType.Operator },
  '-': { precedence: 150, type: OperatorType.Subtract, tokenType: TokenType.Operator },
  '~': { precedence: 150, type: OperatorType.BitwiseInvert, tokenType: TokenType.Operator }, // Bitwise not
}

const BinaryOperators = {
  or: { precedence: 50, type: OperatorType.Or, tokenType: TokenType.Keyword },
  and: { precedence: 60, type: OperatorType.And, tokenType: TokenType.Keyword },
  '==': { precedence: 80, type: OperatorType.Equals, tokenType: TokenType.Operator },
  '!=': { precedence: 80, type: OperatorType.NotEquals, tokenType: TokenType.Operator },
  '>=': { precedence: 80, type: OperatorType.GreaterThanOrEqual, tokenType: TokenType.Operator },
  '>': { precedence: 80, type: OperatorType.GreaterThan, tokenType: TokenType.Operator },
  '<=': { precedence: 80, type: OperatorType.LessThanOrEqual, tokenType: TokenType.Operator },
  '<': { precedence: 80, type: OperatorType.LessThan, tokenType: TokenType.Operator },
  'is not': { precedence: 80, type: OperatorType.IsNot, tokenType: TokenType.Keyword },
  is: { precedence: 80, type: OperatorType.Is, tokenType: TokenType.Operator },
  'not in': { precedence: 80, type: OperatorType.NotIn, tokenType: TokenType.Keyword },
  in: { precedence: 80, type: OperatorType.In, tokenType: TokenType.Keyword },
  '|': { precedence: 90, type: OperatorType.BitwiseOr, tokenType: TokenType.Operator },
  '^': { precedence: 100, type: OperatorType.BitwiseXor, tokenType: TokenType.Operator },
  '&': { precedence: 110, type: OperatorType.BitwiseAnd, tokenType: TokenType.Operator },
  '<<': { precedence: 120, type: OperatorType.LeftShift, tokenType: TokenType.Operator },
  '>>': { precedence: 120, type: OperatorType.RightShift, tokenType: TokenType.Operator },
  '+': { precedence: 130, type: OperatorType.Add, tokenType: TokenType.Operator },
  '-': { precedence: 130, type: OperatorType.Subtract, tokenType: TokenType.Operator },
  '*': { precedence: 140, type: OperatorType.Multiply, tokenType: TokenType.Operator },
  '/': { precedence: 140, type: OperatorType.Divide, tokenType: TokenType.Operator },
  '//': { precedence: 140, type: OperatorType.FloorDivide, tokenType: TokenType.Operator },
  '%': { precedence: 140, type: OperatorType.Mod, tokenType: TokenType.Operator },
  '@': { precedence: 140, type: OperatorType.MatrixMultiply, tokenType: TokenType.Operator },
  '**': { precedence: 160, type: OperatorType.Power, tokenType: TokenType.Operator },
}

function parseTokenToPyright(parseMapper: ParseMapper, node: SplootNode): ExpressionNode {
  return (node as PythonNode).generateParseTree(parseMapper) as ExpressionNode
}

function parseLeafToPyright(
  parseMapper: ParseMapper,
  tokens: SplootNode[],
  currentIndex: number
): [boolean, number, ExpressionNode] {
  if (currentIndex >= tokens.length) {
    // No tokens left when a leaf was expected
    const errorExpr: ErrorNode = {
      nodeType: ParseNodeType.Error,
      category: ErrorExpressionCategory.MissingExpression,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
    }
    return [false, currentIndex, errorExpr]
  }
  const lookahead = tokens[currentIndex]
  if (lookahead.type === 'PYTHON_BINARY_OPERATOR') {
    const op = (lookahead as PythonBinaryOperator).getOperator()
    if (op in UnaryOperators) {
      // Don't care if it's invalid, it'll return an error node if needed
      const [, leafIndex, operandNode] = parseLeafToPyright(parseMapper, tokens, currentIndex + 1)
      const lhs: UnaryOperationNode = {
        nodeType: ParseNodeType.UnaryOperation,
        expression: operandNode,
        id: parseMapper.getNextId(),
        length: 0,
        start: 0,
        operator: UnaryOperators[op].type,
        operatorToken: { start: 0, length: 0, type: UnaryOperators[op].tokenType },
      }
      operandNode.parent = lhs
      return parseExpressionToPyright(parseMapper, tokens, lhs, leafIndex, UnaryOperators[op]['precedence'])
    }
    const errorExpr: ErrorNode = {
      nodeType: ParseNodeType.Error,
      category: ErrorExpressionCategory.MissingExpression,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
    }
    return [false, currentIndex, errorExpr]
  }
  // Consume one token - whatever it was it wasn't an operator
  const leafNode = parseTokenToPyright(parseMapper, lookahead)
  return [true, currentIndex + 1, leafNode]
}

function parseExpressionToPyright(
  parseMapper: ParseMapper,
  tokens: SplootNode[],
  lhs: ExpressionNode,
  currentIndex: number,
  minPrecedence: number
): [boolean, number, ExpressionNode] {
  if (currentIndex >= tokens.length) {
    // Ran out of tokens
    return [true, currentIndex, lhs]
  }

  let lookahead = tokens[currentIndex]
  while (
    lookahead &&
    lookahead.type === 'PYTHON_BINARY_OPERATOR' &&
    BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()] &&
    BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()].precedence >= minPrecedence
  ) {
    const operator = (lookahead as PythonBinaryOperator).getOperator()
    const precedence = BinaryOperators[operator].precedence
    currentIndex += 1
    let rhs = null
    ;[, currentIndex, rhs] = parseLeafToPyright(parseMapper, tokens, currentIndex)

    if (currentIndex === tokens.length) {
      // TODO: lhs + op + rhs
      // return [true, currentIndex, null]
    }

    lookahead = tokens[currentIndex]
    while (
      lookahead &&
      lookahead.type === 'PYTHON_BINARY_OPERATOR' &&
      BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()] &&
      BinaryOperators[(lookahead as PythonBinaryOperator).getOperator()].precedence > precedence
    ) {
      const secondOp = (lookahead as PythonBinaryOperator).getOperator()
      const secondPrecedence = BinaryOperators[secondOp].precedence
      let exprValid = false
      ;[exprValid, currentIndex, rhs] = parseExpressionToPyright(
        parseMapper,
        tokens,
        lhs,
        currentIndex,
        secondPrecedence
      )
      if (!exprValid) {
        // Invalid secondary parse
        return [false, currentIndex, null]
      }
      if (currentIndex < tokens.length) {
        lookahead = tokens[currentIndex]
      } else {
        lookahead = null
      }
    }
    const expr: BinaryOperationNode = {
      nodeType: ParseNodeType.BinaryOperation,
      leftExpression: lhs,
      rightExpression: rhs,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      operator: BinaryOperators[operator].type,
      operatorToken: { length: 0, start: 0, type: BinaryOperators[operator].tokenType },
    }
    if (expr.leftExpression) {
      expr.leftExpression.parent = expr
    }
    if (expr.rightExpression) {
      expr.rightExpression.parent = expr
    }
    lhs = expr
  }
  // Have parsed all valid operators
  return [true, currentIndex, lhs]
}

export function parseToPyright(parseMapper: ParseMapper, tokens: SplootNode[]): ExpressionNode {
  if (tokens.length === 0) {
    return {
      nodeType: ParseNodeType.Error,
      category: ErrorExpressionCategory.MissingExpression,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
    }
  }
  const [valid, index, leftNode] = parseLeafToPyright(parseMapper, tokens, 0)
  if (!valid) {
    // No valid leaf at the start
    return {
      nodeType: ParseNodeType.Error,
      category: ErrorExpressionCategory.MissingExpression,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
    }
  }
  const [, , overallNode] = parseExpressionToPyright(parseMapper, tokens, leftNode, index, 0)
  return overallNode
}

function parseLeaf(tokens: SplootNode[], currentIndex: number): [boolean, number] {
  if (currentIndex >= tokens.length) {
    // No tokens left when a leaf was expected
    return [false, currentIndex]
  }
  const lookahead = tokens[currentIndex]
  if (lookahead.type === 'PYTHON_BINARY_OPERATOR') {
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
    lookahead.type === 'PYTHON_BINARY_OPERATOR' &&
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
      lookahead.type === 'PYTHON_BINARY_OPERATOR' &&
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
