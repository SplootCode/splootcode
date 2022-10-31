import { CallNode, ExpressionNode, ParseNodeType } from 'structured-pyright'
import { ChildSetType } from '@splootcode/core'
import { FunctionArgType, FunctionSignature } from '../scope/types'
import { NodeCategory } from '@splootcode/core'
import { PYTHON_ARGUMENT, PythonArgument } from './python_argument'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonNode } from './python_node'

export abstract class PythonCallNode extends PythonNode {
  initArgumentsChildSet(signature: FunctionSignature) {
    this.addChildSet('arguments', ChildSetType.Many, NodeCategory.PythonFunctionArgument)
    const paramNames = []
    if (signature) {
      for (const arg of signature.arguments) {
        if (arg.type == FunctionArgType.PositionalOnly || arg.type == FunctionArgType.PositionalOrKeyword) {
          paramNames.push(arg.name)

          // Create spaces for all required args
          if (!arg.defaultValue) {
            this.getArguments().addChild(new PythonArgument(null))
          }
        }
      }
      if (signature.arguments.length !== 0 && this.getArguments().getCount() === 0) {
        this.getArguments().addChild(new PythonArgument(null))
      }
    }
    this.metadata.set('params', paramNames)
  }

  getArguments() {
    return this.getChildSet('arguments')
  }

  generateParseTree(parseMapper: ParseMapper): CallNode {
    const leftExpression = this.generateLeftExpression(parseMapper)
    let args = this.getArguments().children
    if (args.length === 1 && args[0].isEmpty()) {
      args = []
    }

    const callVarExpr: CallNode = {
      nodeType: ParseNodeType.Call,
      id: parseMapper.getNextId(),
      length: 0,
      start: 0,
      arguments: args
        .filter((argNode) => {
          return !argNode.isEmpty()
        })
        .map((argNode) => {
          const ret = (argNode as PythonArgument).generateParseTree(parseMapper)
          return ret
        }),
      leftExpression: leftExpression,
      trailingComma: false,
    }
    leftExpression.parent = callVarExpr
    callVarExpr.arguments.forEach((arg) => (arg.parent = callVarExpr))
    parseMapper.addNode(this, callVarExpr)
    return callVarExpr
  }

  abstract generateLeftExpression(parseMapper: ParseMapper): ExpressionNode

  validateArguments(): void {
    const elements = this.getArguments().children
    if (elements.length == 1) {
      if (elements[0].type === PYTHON_ARGUMENT) {
        ;(elements[0] as PythonArgument).allowEmpty()
      }
    } else {
      elements.forEach((arg: PythonArgument, idx) => {
        // TODO: Add function argument names when required
        arg.requireNonEmpty('Cannot have empty function arguments')
      })
    }
  }
}
