import { Assignment } from "./types/js/assignment";
import { AsyncFunctionDeclaration } from "./types/js/async_function";
import { AwaitExpression } from "./types/js/await_expression";
import { BinaryOperator } from "./types/js/binary_operator";
import { CallMember } from "./types/js/call_member";
import { CallVariable } from "./types/js/call_variable";
import { SplootDataSheet } from "./types/dataset/datasheet";
import { SplootDataFieldDeclaration } from "./types/dataset/field_declaration";
import { SplootDataRow } from "./types/dataset/row";
import { SplootDataStringEntry } from "./types/dataset/string_entry";
import { DeclaredIdentifier } from "./types/js/declared_identifier";
import { SplootExpression } from "./types/js/expression";
import { FunctionDeclaration } from "./types/js/functions";
import { SplootHtmlAttribute } from "./types/html/html_attribute";
import { SplootHtmlDocument } from "./types/html/html_document";
import { SplootHtmlElement } from "./types/html/html_element";
import { SplootHtmlScriptElement } from "./types/html/html_script_element";
import { SplootHtmlStyleElement } from "./types/html/html_style_element";
import { IfStatement } from "./types/js/if";
import { ImportStatement } from "./types/js/import";
import { InlineFunctionDeclaration } from "./types/js/inline_function";
import { JavascriptFile } from "./types/js/javascript_file";
import { ListExpression } from "./types/js/list";
import { NullLiteral, NumericLiteral, StringLiteral } from "./types/literals";
import { LogicalExpression } from "./types/js/logical_expression";
import { LookupExpression } from "./types/js/lookup_expression";
import { MemberExpression } from "./types/js/member_expression";
import { ObjectExpression } from "./types/js/object_expression";
import { ObjectProperty } from "./types/js/object_property";
import { StyleProperty } from "./types/styles/style_property";
import { StyleRule } from "./types/styles/style_rule";
import { StyleSelector } from "./types/styles/style_selector";
import { VariableDeclaration } from "./types/js/variable_declaration";
import { VariableReference } from "./types/js/variable_reference";
import { resolvePasteAdapters } from "./type_registry";
import { ComponentDeclaration } from "./types/component/component_declaration";
import { DeclaredProperty } from "./types/component/declared_property";
import { ReturnStatement } from "./types/js/return";
import { ReactElementNode } from "./types/component/react_element";
import { ForEachExpression } from "./types/component/for_each_expression";
import { ComponentProperty } from "./types/component/component_property";
import { PropertyReference } from "./types/component/property_reference";
import { ComponentInvocation } from "./types/component/component_invocation";
import { JssStyleBlock } from "./types/jss_styles/jss_style_block";
import { ImportDefaultStatement } from "./types/js/import_default";
import { JssClassBlock } from "./types/jss_styles/jss_class_block";
import { JssStyleProperty } from "./types/jss_styles/jss_style_property";
import { JssHoverBlock } from "./types/jss_styles/jss_hover_block";


export function loadTypes() {
  Assignment.register();
  BinaryOperator.register();
  CallMember.register();
  CallVariable.register();
  MemberExpression.register();
  LookupExpression.register();
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
  ImportStatement.register();
  ImportDefaultStatement.register();
  ReturnStatement.register();

  StringLiteral.register();
  NumericLiteral.register();
  NullLiteral.register();
  ListExpression.register();
  ObjectExpression.register();
  ObjectProperty.register();
  
  SplootHtmlDocument.register();
  SplootHtmlAttribute.register();
  SplootHtmlElement.register();
  SplootHtmlScriptElement.register();
  SplootHtmlStyleElement.register();

  StyleRule.register();
  StyleSelector.register();
  StyleProperty.register();

  ComponentDeclaration.register();
  ComponentInvocation.register();
  DeclaredProperty.register();
  ComponentProperty.register();
  PropertyReference.register();
  ReactElementNode.register();
  ForEachExpression.register();

  JssStyleBlock.register();
  JssClassBlock.register();
  JssStyleProperty.register();
  JssHoverBlock.register();

  JavascriptFile.register();

  SplootDataSheet.register();
  SplootDataFieldDeclaration.register();
  SplootDataRow.register();
  SplootDataStringEntry.register();

  // Must go at the end
  resolvePasteAdapters();
}