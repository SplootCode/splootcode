import * as recast from "recast";
import * as babylon from "recast/parsers/babylon.js";

import { ASTNode } from "ast-types";

import { SplootNode, ParentReference } from '@splootcode/core/language/node';
import { FileKind, FunctionDeclarationKind, VariableDeclarationKind, VariableDeclaratorKind, IdentifierKind, StringLiteralKind, IfStatementKind, BlockStatementKind, BinaryExpressionKind, NumericLiteralKind, ExpressionStatementKind, CallExpressionKind, MemberExpressionKind, LogicalExpressionKind, AssignmentExpressionKind, FunctionExpressionKind, NullLiteralKind, AwaitExpressionKind, ExpressionKind, UnaryExpressionKind } from "ast-types/gen/kinds";
import { FunctionDeclaration } from "@splootcode/core/language/types/js/functions";
import { ChildSet } from "@splootcode/core/language/childset";
import { VariableDeclaration } from "@splootcode/core/language/types/js/variable_declaration";
import { StringLiteral, NumericLiteral, NullLiteral } from "@splootcode/core/language/types/literals";
import { IfStatement } from "@splootcode/core/language/types/js/if";
import { VariableReference } from "@splootcode/core/language/types/js/variable_reference";
import { BinaryOperator } from "@splootcode/core/language/types/js/binary_operator";
import { MemberExpression } from "@splootcode/core/language/types/js/member_expression";
import { DeclaredIdentifier } from "@splootcode/core/language/types/js/declared_identifier";
import { CallMember } from "@splootcode/core/language/types/js/call_member";
import { CallVariable } from "@splootcode/core/language/types/js/call_variable";
import { LogicalExpression } from "@splootcode/core/language/types/js/logical_expression";
import { SplootExpression } from "@splootcode/core/language/types/js/expression";
import { JavascriptFile } from "@splootcode/core/language/types/js/javascript_file";
import { Assignment } from "@splootcode/core/language/types/js/assignment";
import { InlineFunctionDeclaration } from "@splootcode/core/language/types/js/inline_function";
import { AwaitExpression } from "@splootcode/core/language/types/js/await_expression";
import { AsyncFunctionDeclaration } from "@splootcode/core/language/types/js/async_function";


function populateChildSetFromAst(childSet: ChildSet, nodeList: ASTNode[], createExpressions: boolean = false) {
  nodeList.forEach((astNode: ASTNode) => {
    if (createExpressions) {
      let expr = new SplootExpression(childSet.getParentRef());
      populateExpressionNodeFromAst(expr, astNode);
      childSet.addChild(expr);
    } else {
      childSet.addChild(createNodeFromAst(childSet.getParentRef(), astNode));
    }
  })
}

function getSingleTokenFromExpression(astNode: ASTNode) : SplootNode {
  let tempExp = new SplootExpression(null);
  populateExpressionNodeFromAst(tempExp, astNode);
  return tempExp.getTokenSet().getChild(0);
}

function populateExpressionNodeFromAst(expressionNode: SplootExpression, astNode: ASTNode) : void {
  let parentRef = expressionNode.getTokenSet().getParentRef();
  switch(astNode.type) {
    case 'FunctionExpression':
      let funcNode = astNode as FunctionExpressionKind;
      let newFuncNode = new InlineFunctionDeclaration(parentRef);
      populateChildSetFromAst(newFuncNode.getParams(), funcNode.params);
      populateChildSetFromAst(newFuncNode.getBody(), funcNode.body.body);
      expressionNode.getTokenSet().addChild(newFuncNode);
      break;
    case 'StringLiteral':
      let strNode = astNode as StringLiteralKind;
      expressionNode.getTokenSet().addChild(new StringLiteral(parentRef, strNode.value));
      break;
    case 'NumericLiteral':
      let numNode = astNode as NumericLiteralKind;
      expressionNode.getTokenSet().addChild(new NumericLiteral(parentRef, numNode.value));
      break;
    case 'NullLiteral':
      expressionNode.getTokenSet().addChild(new NullLiteral(parentRef));
      break;
    case 'Identifier':
      // Assume variable reference for now (variable declaration is handled separately)
      let idNode = astNode as IdentifierKind;
      expressionNode.getTokenSet().addChild(new VariableReference(parentRef, idNode.name));
      break;
    case 'UnaryExpression':
        let unNode = astNode as UnaryExpressionKind;
        // Beacuse we're just assmbling tokens, there's no differnce between a unary and binary operator.
        let unTokenNode = new BinaryOperator(parentRef, unNode.operator);
        expressionNode.getTokenSet().addChild(unTokenNode);
        populateExpressionNodeFromAst(expressionNode, unNode.argument);
        break;
    case 'BinaryExpression':
      let binNode = astNode as BinaryExpressionKind;
      let binTokenNode = new BinaryOperator(parentRef, binNode.operator);
      populateExpressionNodeFromAst(expressionNode, binNode.left);
      expressionNode.getTokenSet().addChild(binTokenNode);
      populateExpressionNodeFromAst(expressionNode, binNode.right);
      break;
    case 'LogicalExpression':
      let logNode = astNode as LogicalExpressionKind;
      let logicTokenNode = new LogicalExpression(parentRef);
      logicTokenNode.setOperator(logNode.operator);
      populateChildSetFromAst(logicTokenNode.getArguments(), [logNode.left, logNode.right], true);
      expressionNode.getTokenSet().addChild(logicTokenNode);
      break;
    case 'CallExpression':
      let callNode = astNode as CallExpressionKind;
      let callee = callNode.callee;
      if (callee.type == 'MemberExpression') {
        let memberNode = callee as MemberExpressionKind;
        let newCallNode = new CallMember(parentRef);
        // Let's assume the property is always an identifier expression
        newCallNode.setMember((memberNode.property as IdentifierKind).name);
        newCallNode.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object));
        populateChildSetFromAst(newCallNode.getArguments(), callNode.arguments, true);
        expressionNode.getTokenSet().addChild(newCallNode);
      } else if (callee.type == 'Identifier') {
        let idNode = callee as IdentifierKind;
        let newIdCallnode = new CallVariable(parentRef, idNode.name);
        populateChildSetFromAst(newIdCallnode.getArguments(), callNode.arguments, true);
        expressionNode.getTokenSet().addChild(newIdCallnode);
      } else {
        // TODO: Support calling the result of an expression that's not a member expression.
      }
      break;
    case 'AssignmentExpression':
        let assignNode = astNode as AssignmentExpressionKind;
        let newAssignNode = new Assignment(parentRef);
        let leftExpression = newAssignNode.getLeft().getChild(0) as SplootExpression;
        populateExpressionNodeFromAst(leftExpression, assignNode.left);
        let rightExpression = newAssignNode.getRight().getChild(0) as SplootExpression;
        populateExpressionNodeFromAst(rightExpression, assignNode.right);
        expressionNode.getTokenSet().addChild(newAssignNode);
        break;
    case 'MemberExpression':
      let memberNode = astNode as MemberExpressionKind;
      let newMemberNode = new MemberExpression(parentRef);
      // Let's assume the property is always an identifier expression
      newMemberNode.setMember((memberNode.property as IdentifierKind).name);
      newMemberNode.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object));
      expressionNode.getTokenSet().addChild(newMemberNode);
      break;
    case 'AwaitExpression':
      let awaitNode = astNode as AwaitExpressionKind;
      let newAwaitNode = new AwaitExpression(null);
      let expr = newAwaitNode.getExpression().getChild(0) as SplootExpression;
      populateExpressionNodeFromAst(expr, awaitNode.argument);
      expressionNode.getTokenSet().addChild(newAwaitNode);
      break;
    default:
      console.warn('Unrecognised expression node type; ', astNode.type);
      console.log(astNode);
  }
}

function createNodeFromAst(parentRef: ParentReference, astNode : ASTNode) : SplootNode {
  let node = null;
  switch(astNode.type) {
    case 'File':
      let fileNode = astNode as FileKind;
      node = new JavascriptFile(parentRef);
      populateChildSetFromAst(node.getBody(), fileNode.program.body);
      break;
    case 'FunctionDeclaration':
      let funcNode = astNode as FunctionDeclarationKind;
      if (funcNode.async) {
        node = new AsyncFunctionDeclaration(parentRef);
        populateChildSetFromAst(node.getIdentifier(), [funcNode.id])
        populateChildSetFromAst(node.getParams(), funcNode.params)
        populateChildSetFromAst(node.getBody(), funcNode.body.body)
      } else {
        node = new FunctionDeclaration(parentRef);
        populateChildSetFromAst(node.getIdentifier(), [funcNode.id])
        populateChildSetFromAst(node.getParams(), funcNode.params)
        populateChildSetFromAst(node.getBody(), funcNode.body.body)
      }
      break;
    case 'VariableDeclaration':
      let decNode = astNode as VariableDeclarationKind;
      if (decNode.declarations.length > 1) {
        throw 'More than one variable declaration in a statement';
      }
      // This hack assumes only one variable declaration at a time.
      let declarator = decNode.declarations[0] as VariableDeclaratorKind;
      node = new VariableDeclaration(parentRef);
      let name = (declarator.id as IdentifierKind).name;
      let identifierNode = new DeclaredIdentifier(null, name)
      node.getDeclarationIdentifier().addChild(identifierNode);
      let initExpression = (node as VariableDeclaration).getInit().getChild(0) as SplootExpression;
      populateExpressionNodeFromAst(initExpression, declarator.init);
      break;
    case 'IfStatement':
      let ifNode = astNode as IfStatementKind;
      node = new IfStatement(parentRef);
      let conditionExpression = node.getCondition().getChild(0);
      populateExpressionNodeFromAst(conditionExpression, ifNode.test);
      let cons = ifNode.consequent as BlockStatementKind;
      populateChildSetFromAst(node.getTrueBlock(), cons.body);
      if (ifNode.alternate) {
        if (ifNode.alternate.type === 'BlockStatement'){
          let block = ifNode.alternate as BlockStatementKind;
          populateChildSetFromAst(node.getElseBlock(), block.body);
        }
      }
      break;
    case 'Identifier':
      // Assume variable reference for now (variable declaration is handled separately)
      let idNode = astNode as IdentifierKind;
      node = new VariableReference(parentRef, idNode.name);
      break;
    case 'ExpressionStatement':
      // In our world, expressions can be statements too.
      let expNode = astNode as ExpressionStatementKind;
      node = new SplootExpression(parentRef);
      populateExpressionNodeFromAst(node, expNode.expression)
      break;
    case 'MemberExpression':
      let memberNode = astNode as MemberExpressionKind;
      node = new MemberExpression(parentRef);
      // Let's assume the property is always an identifier expression
      node.setMember((memberNode.property as IdentifierKind).name);
      node.getObjectExpressionToken().addChild(getSingleTokenFromExpression(memberNode.object))
      break;
    default:
      node = null;
  }

  if (!node) {
    console.warn('Unrecognised node type; ', astNode.type);
    console.log(astNode);
    return null;
  }
  return node;
}

export function parseJs(source: string) : SplootNode {
  const ast = recast.parse(source, {parser: babylon});
  let splootNode = createNodeFromAst(null, ast);
  return splootNode;
}