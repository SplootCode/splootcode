import { Assignment } from "./types/assignment";
import { AsyncFunctionDeclaration } from "./types/async_function";
import { AwaitExpression } from "./types/await_expression";
import { BinaryOperator } from "./types/binary_operator";
import { CallMember } from "./types/call_member";
import { CallVariable } from "./types/call_variable";
import { DeclaredIdentifier } from "./types/declared_identifier";
import { SplootExpression } from "./types/expression";
import { FunctionDeclaration } from "./types/functions";
import { SplootHtmlAttribute } from "./types/html_attribute";
import { SplootHtmlDocument } from "./types/html_document";
import { SplootHtmlElement } from "./types/html_element";
import { SplootHtmlScriptElement } from "./types/html_script_element";
import { IfStatement } from "./types/if";
import { InlineFunctionDeclaration } from "./types/inline_function";
import { JavascriptFile } from "./types/javascript_file";
import { NullLiteral, NumericLiteral, StringLiteral } from "./types/literals";
import { LogicalExpression } from "./types/logical_expression";
import { MemberExpression } from "./types/member_expression";
import { VariableDeclaration } from "./types/variable_declaration";
import { VariableReference } from "./types/variable_reference";


export function loadTypes() {
  Assignment.register();
  BinaryOperator.register();
  CallMember.register();
  CallVariable.register();
  MemberExpression.register();
  VariableReference.register();
  VariableDeclaration.register();
  FunctionDeclaration.register();
  AsyncFunctionDeclaration.register();
  InlineFunctionDeclaration.register();
  DeclaredIdentifier.register();
  SplootExpression.register();
  LogicalExpression.register();
  AwaitExpression.register();
  IfStatement.register();

  StringLiteral.register();
  NumericLiteral.register();
  NullLiteral.register();
  
  SplootHtmlDocument.register();
  SplootHtmlAttribute.register();
  SplootHtmlElement.register();
  SplootHtmlScriptElement.register();

  JavascriptFile.register();
}