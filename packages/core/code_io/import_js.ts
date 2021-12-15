import * as recast from 'recast'
import * as babylon from 'recast/parsers/babylon.js'

import { ASTNode } from 'ast-types'

import { SplootNode, ParentReference } from '../language/node'
import {
  FileKind,
  FunctionDeclarationKind,
  VariableDeclarationKind,
  VariableDeclaratorKind,
  IdentifierKind,
  StringLiteralKind,
  IfStatementKind,
  BlockStatementKind,
  BinaryExpressionKind,
  NumericLiteralKind,
  ExpressionStatementKind,
  CallExpressionKind,
  MemberExpressionKind,
  LogicalExpressionKind,
  AssignmentExpressionKind,
  FunctionExpressionKind,
  AwaitExpressionKind,
  UnaryExpressionKind,
} from 'ast-types/gen/kinds'
import { FunctionDeclaration } from '../language/types/js/functions'
import { ChildSet } from '../language/childset'
import { VariableDeclaration } from '../language/types/js/variable_declaration'
import { StringLiteral, NumericLiteral, NullLiteral } from '../language/types/literals'
import { IfStatement } from '../language/types/js/if'
import { VariableReference } from '../language/types/js/variable_reference'
import { BinaryOperator } from '../language/types/js/binary_operator'
import { MemberExpression } from '../language/types/js/member_expression'
import { DeclaredIdentifier } from '../language/types/js/declared_identifier'
import { CallMember } from '../language/types/js/call_member'
import { CallVariable } from '../language/types/js/call_variable'
import { LogicalExpression } from '../language/types/js/logical_expression'
import { SplootExpression } from '../language/types/js/expression'
import { JavascriptFile } from '../language/types/js/javascript_file'
import { Assignment } from '../language/types/js/assignment'
import { InlineFunctionDeclaration } from '../language/types/js/inline_function'
import { AwaitExpression } from '../language/types/js/await_expression'
import { AsyncFunctionDeclaration } from '../language/types/js/async_function'

function populateChildSetFromAst(childSet: ChildSet, nodeList: ASTNode[], createExpressions = false) {
  nodeList.forEach((astNode: ASTNode) => {
    if (createExpressions) {
      const expr = new SplootExpression(childSet.getParentRef())
      populateExpressionNodeFromAst(expr, astNode)
      childSet.addChild(expr)
    } else {
      childSet.addChild(createNodeFromAst(childSet.getParentRef(), astNode))
    }
  })
}

function getSingleTokenFromExpression(astNode: ASTNode): SplootNode {
  const tempExp = new SplootExpression(null)
  populateExpressionNodeFromAst(tempExp, astNode)
  return tempExp.getTokenSet().getChild(0)
}

function populateExpressionNodeFromAst(expressionNode: SplootExpression, astNode: ASTNode): void {
  const parentRef = expressionNode.getTokenSet().getParentRef()
  switch (astNode.type) {
    case 'FunctionExpression':
      const funcNode = astNode as FunctionExpressionKind
      const newFuncNode = new InlineFunctionDeclaration(parentRef)
      populateChildSetFromAst(newFuncNode.getParams(), funcNode.params)
      populateChildSetFromAst(newFuncNode.getBody(), funcNode.body.body)
      expressionNode.getTokenSet().addChild(newFuncNode)
      break
    case 'StringLiteral':
      const strNode = astNode as StringLiteralKind
      expressionNode.getTokenSet().addChild(new StringLiteral(parentRef, strNode.value))
      break
    case 'NumericLiteral':
      const numNode = astNode as NumericLiteralKind
      expressionNode.getTokenSet().addChild(new NumericLiteral(parentRef, numNode.value))
      break
    case 'NullLiteral':
      expressionNode.getTokenSet().addChild(new NullLiteral(parentRef))
      break
    case 'Identifier':
      // Assume variable reference for now (variable declaration is handled separately)
      const idNode = astNode as IdentifierKind
      expressionNode.getTokenSet().addChild(new VariableReference(parentRef, idNode.name))
      break
    case 'UnaryExpression':
      const unNode = astNode as UnaryExpressionKind
      // Beacuse we're just assmbling tokens, there's no differnce between a unary and binary operator.
      const unTokenNode = new BinaryOperator(parentRef, unNode.operator)
      expressionNode.getTokenSet().addChild(unTokenNode)
      populateExpressionNodeFromAst(expressionNode, unNode.argument)
      break
    case 'BinaryExpression':
      const binNode = astNode as BinaryExpressionKind
      const binTokenNode = new BinaryOperator(parentRef, binNode.operator)
      populateExpressionNodeFromAst(expressionNode, binNode.left)
      expressionNode.getTokenSet().addChild(binTokenNode)
      populateExpressionNodeFromAst(expressionNode, binNode.right)
      break
    case 'LogicalExpression':
      const logNode = astNode as LogicalExpressionKind
      const logicTokenNode = new LogicalExpression(parentRef)
      logicTokenNode.setOperator(logNode.operator)
      populateChildSetFromAst(logicTokenNode.getArguments(), [logNode.left, logNode.right], true)
      expressionNode.getTokenSet().addChild(logicTokenNode)
      break
    case 'CallExpression':
      const callNode = astNode as CallExpressionKind
      const callee = callNode.callee
      if (callee.type == 'MemberExpression') {
        const memberNode = callee as MemberExpressionKind
        const newCallNode = new CallMember(parentRef)
        // Let's assume the property is always an identifier expression
        newCallNode.setMember((memberNode.property as IdentifierKind).name)
        newCallNode.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object))
        populateChildSetFromAst(newCallNode.getArguments(), callNode.arguments, true)
        expressionNode.getTokenSet().addChild(newCallNode)
      } else if (callee.type == 'Identifier') {
        const idNode = callee as IdentifierKind
        const newIdCallnode = new CallVariable(parentRef, idNode.name)
        populateChildSetFromAst(newIdCallnode.getArguments(), callNode.arguments, true)
        expressionNode.getTokenSet().addChild(newIdCallnode)
      } else {
        // TODO: Support calling the result of an expression that's not a member expression.
      }
      break
    case 'AssignmentExpression':
      const assignNode = astNode as AssignmentExpressionKind
      const newAssignNode = new Assignment(parentRef)
      const leftExpression = newAssignNode.getLeft().getChild(0) as SplootExpression
      populateExpressionNodeFromAst(leftExpression, assignNode.left)
      const rightExpression = newAssignNode.getRight().getChild(0) as SplootExpression
      populateExpressionNodeFromAst(rightExpression, assignNode.right)
      expressionNode.getTokenSet().addChild(newAssignNode)
      break
    case 'MemberExpression':
      const memberNode = astNode as MemberExpressionKind
      const newMemberNode = new MemberExpression(parentRef)
      // Let's assume the property is always an identifier expression
      newMemberNode.setMember((memberNode.property as IdentifierKind).name)
      newMemberNode.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object))
      expressionNode.getTokenSet().addChild(newMemberNode)
      break
    case 'AwaitExpression':
      const awaitNode = astNode as AwaitExpressionKind
      const newAwaitNode = new AwaitExpression(null)
      const expr = newAwaitNode.getExpression().getChild(0) as SplootExpression
      populateExpressionNodeFromAst(expr, awaitNode.argument)
      expressionNode.getTokenSet().addChild(newAwaitNode)
      break
    default:
      console.warn('Unrecognised expression node type; ', astNode.type)
      console.log(astNode)
  }
}

function createNodeFromAst(parentRef: ParentReference, astNode: ASTNode): SplootNode {
  let node = null
  switch (astNode.type) {
    case 'File':
      const fileNode = astNode as FileKind
      node = new JavascriptFile(parentRef)
      populateChildSetFromAst(node.getBody(), fileNode.program.body)
      break
    case 'FunctionDeclaration':
      const funcNode = astNode as FunctionDeclarationKind
      if (funcNode.async) {
        node = new AsyncFunctionDeclaration(parentRef)
        populateChildSetFromAst(node.getIdentifier(), [funcNode.id])
        populateChildSetFromAst(node.getParams(), funcNode.params)
        populateChildSetFromAst(node.getBody(), funcNode.body.body)
      } else {
        node = new FunctionDeclaration(parentRef)
        populateChildSetFromAst(node.getIdentifier(), [funcNode.id])
        populateChildSetFromAst(node.getParams(), funcNode.params)
        populateChildSetFromAst(node.getBody(), funcNode.body.body)
      }
      break
    case 'VariableDeclaration':
      const decNode = astNode as VariableDeclarationKind
      if (decNode.declarations.length > 1) {
        throw 'More than one variable declaration in a statement'
      }
      // This hack assumes only one variable declaration at a time.
      const declarator = decNode.declarations[0] as VariableDeclaratorKind
      node = new VariableDeclaration(parentRef)
      const name = (declarator.id as IdentifierKind).name
      const identifierNode = new DeclaredIdentifier(null, name)
      node.getDeclarationIdentifier().addChild(identifierNode)
      const initExpression = (node as VariableDeclaration).getInit().getChild(0) as SplootExpression
      populateExpressionNodeFromAst(initExpression, declarator.init)
      break
    case 'IfStatement':
      const ifNode = astNode as IfStatementKind
      node = new IfStatement(parentRef)
      const conditionExpression = node.getCondition().getChild(0)
      populateExpressionNodeFromAst(conditionExpression, ifNode.test)
      const cons = ifNode.consequent as BlockStatementKind
      populateChildSetFromAst(node.getTrueBlock(), cons.body)
      if (ifNode.alternate) {
        if (ifNode.alternate.type === 'BlockStatement') {
          const block = ifNode.alternate as BlockStatementKind
          populateChildSetFromAst(node.getElseBlock(), block.body)
        }
      }
      break
    case 'Identifier':
      // Assume variable reference for now (variable declaration is handled separately)
      const idNode = astNode as IdentifierKind
      node = new VariableReference(parentRef, idNode.name)
      break
    case 'ExpressionStatement':
      // In our world, expressions can be statements too.
      const expNode = astNode as ExpressionStatementKind
      node = new SplootExpression(parentRef)
      populateExpressionNodeFromAst(node, expNode.expression)
      break
    case 'MemberExpression':
      const memberNode = astNode as MemberExpressionKind
      node = new MemberExpression(parentRef)
      // Let's assume the property is always an identifier expression
      node.setMember((memberNode.property as IdentifierKind).name)
      node.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object))
      break
    default:
      node = null
  }

  if (!node) {
    console.warn('Unrecognised node type; ', astNode.type)
    console.log(astNode)
    return null
  }
  return node
}

export function parseJs(source: string): SplootNode {
  const ast = recast.parse(source, { parser: babylon })
  const splootNode = createNodeFromAst(null, ast)
  return splootNode
}
