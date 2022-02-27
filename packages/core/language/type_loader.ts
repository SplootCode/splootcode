import { Assignment } from './types/js/assignment'
import { AsyncFunctionDeclaration } from './types/js/async_function'
import { AwaitExpression } from './types/js/await_expression'
import { BinaryOperator } from './types/js/binary_operator'
import { CallMember } from './types/js/call_member'
import { CallVariable } from './types/js/call_variable'
import { ComponentDeclaration } from './types/component/component_declaration'
import { ComponentInvocation } from './types/component/component_invocation'
import { ComponentProperty } from './types/component/component_property'
import { DeclaredIdentifier } from './types/js/declared_identifier'
import { DeclaredProperty } from './types/component/declared_property'
import { ForEachExpression } from './types/component/for_each_expression'
import { FunctionDeclaration } from './types/js/functions'
import { IfStatement } from './types/js/if'
import { ImportDefaultStatement } from './types/js/import_default'
import { ImportStatement } from './types/js/import'
import { InlineFunctionDeclaration } from './types/js/inline_function'
import { JavascriptFile } from './types/js/javascript_file'
import { JssClassBlock } from './types/jss_styles/jss_class_block'
import { JssClassReference } from './types/jss_styles/jss_class_reference'
import { JssHoverBlock } from './types/jss_styles/jss_hover_block'
import { JssStyleBlock } from './types/jss_styles/jss_style_block'
import { JssStyleProperty } from './types/jss_styles/jss_style_property'
import { ListExpression } from './types/js/list'
import { LogicalExpression } from './types/js/logical_expression'
import { LookupExpression } from './types/js/lookup_expression'
import { MemberExpression } from './types/js/member_expression'
import { NoneLiteral, PythonBool } from './types/python/literals'
import { NullLiteral, NumericLiteral, StringLiteral } from './types/literals'
import { ObjectExpression } from './types/js/object_expression'
import { ObjectProperty } from './types/js/object_property'
import { PropertyReference } from './types/component/property_reference'
import { PythonAssignment } from './types/python/python_assignment'
import { PythonBinaryOperator } from './types/python/python_binary_operator'
import { PythonBrackets } from './types/python/python_brackets'
import { PythonBreak } from './types/python/python_break'
import { PythonCallMember } from './types/python/python_call_member'
import { PythonCallVariable } from './types/python/python_call_variable'
import { PythonContinue } from './types/python/python_continue'
import { PythonDeclaredIdentifier } from './types/python/declared_identifier'
import { PythonDictionary } from './types/python/python_dictionary'
import { PythonElifBlock } from './types/python/python_elif'
import { PythonElseBlock } from './types/python/python_else'
import { PythonExpression } from './types/python/python_expression'
import { PythonFile } from './types/python/python_file'
import { PythonForLoop } from './types/python/python_for'
import { PythonFromImport } from './types/python/python_from_import'
import { PythonFunctionDeclaration } from './types/python/python_function'
import { PythonIdentifier } from './types/python/python_identifier'
import { PythonIfStatement } from './types/python/python_if'
import { PythonImport } from './types/python/python_import'
import { PythonKeyValue } from './types/python/python_keyvalue'
import { PythonList } from './types/python/python_list'
import { PythonModuleIdentifier } from './types/python/python_module_identifier'
import { PythonReturn } from './types/python/python_return'
import { PythonStatement } from './types/python/python_statement'
import { PythonSubscript } from './types/python/python_subscript'
import { PythonVariableReference } from './types/python/variable_reference'
import { PythonWhileLoop } from './types/python/python_while'
import { ReactElementNode } from './types/component/react_element'
import { ReturnStatement } from './types/js/return'
import { SplootDataFieldDeclaration } from './types/dataset/field_declaration'
import { SplootDataRow } from './types/dataset/row'
import { SplootDataSheet } from './types/dataset/datasheet'
import { SplootDataStringEntry } from './types/dataset/string_entry'
import { SplootExpression } from './types/js/expression'
import { SplootHtmlAttribute } from './types/html/html_attribute'
import { SplootHtmlDocument } from './types/html/html_document'
import { SplootHtmlElement } from './types/html/html_element'
import { SplootHtmlScriptElement } from './types/html/html_script_element'
import { SplootHtmlStyleElement } from './types/html/html_style_element'
import { StyleProperty } from './types/styles/style_property'
import { StyleRule } from './types/styles/style_rule'
import { StyleSelector } from './types/styles/style_selector'
import { VariableDeclaration } from './types/js/variable_declaration'
import { VariableReference } from './types/js/variable_reference'
import { registerPythonAutocompleters } from './types/python/scope_autocompleter'
import { resolvePasteAdapters } from './type_registry'

export function loadTypes() {
  Assignment.register()
  BinaryOperator.register()
  CallMember.register()
  CallVariable.register()
  MemberExpression.register()
  LookupExpression.register()
  VariableReference.register()
  VariableDeclaration.register()
  FunctionDeclaration.register()
  AsyncFunctionDeclaration.register()
  InlineFunctionDeclaration.register()
  DeclaredIdentifier.register()
  SplootExpression.register()
  LogicalExpression.register()
  AwaitExpression.register()
  IfStatement.register()
  ImportStatement.register()
  ImportDefaultStatement.register()
  ReturnStatement.register()

  StringLiteral.register()
  NumericLiteral.register()
  NullLiteral.register()
  ListExpression.register()
  ObjectExpression.register()
  ObjectProperty.register()

  SplootHtmlDocument.register()
  SplootHtmlAttribute.register()
  SplootHtmlElement.register()
  SplootHtmlScriptElement.register()
  SplootHtmlStyleElement.register()

  StyleRule.register()
  StyleSelector.register()
  StyleProperty.register()

  ComponentDeclaration.register()
  ComponentInvocation.register()
  DeclaredProperty.register()
  ComponentProperty.register()
  PropertyReference.register()
  ReactElementNode.register()
  ForEachExpression.register()

  JssStyleBlock.register()
  JssClassBlock.register()
  JssStyleProperty.register()
  JssHoverBlock.register()
  JssClassReference.register()

  JavascriptFile.register()

  SplootDataSheet.register()
  SplootDataFieldDeclaration.register()
  SplootDataRow.register()
  SplootDataStringEntry.register()

  PythonAssignment.register()
  PythonBinaryOperator.register()
  PythonBool.register()
  PythonBrackets.register()
  PythonBreak.register()
  PythonCallMember.register()
  PythonCallVariable.register()
  PythonContinue.register()
  PythonDictionary.register()
  PythonElifBlock.register()
  PythonElseBlock.register()
  PythonExpression.register()
  PythonFile.register()
  PythonForLoop.register()
  PythonFromImport.register()
  PythonFunctionDeclaration.register()
  PythonIdentifier.register()
  PythonIfStatement.register()
  PythonImport.register()
  PythonKeyValue.register()
  PythonList.register()
  PythonModuleIdentifier.register()
  PythonReturn.register()
  PythonStatement.register()
  PythonSubscript.register()
  PythonWhileLoop.register()
  registerPythonAutocompleters()

  NoneLiteral.register()

  // Register deprecated types to provide paste adapters for deserialisation of legacy files/pastes.
  // They do not register into any NodeCategory and cannot be inserted.
  PythonDeclaredIdentifier.register()
  PythonVariableReference.register()

  // Must go at the end
  resolvePasteAdapters()
}
