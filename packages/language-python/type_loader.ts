import { NoneLiteral, PythonBool } from './nodes/literals'
import { PythonArgument } from './nodes/python_argument'
import { PythonAssignment } from './nodes/python_assignment'
import { PythonBinaryOperator } from './nodes/python_binary_operator'
import { PythonBrackets } from './nodes/python_brackets'
import { PythonBreak } from './nodes/python_break'
import { PythonCallMember } from './nodes/python_call_member'
import { PythonCallVariable } from './nodes/python_call_variable'
import { PythonContinue } from './nodes/python_continue'
import { PythonDeclaredIdentifier } from './nodes/declared_identifier'
import { PythonDictionary } from './nodes/python_dictionary'
import { PythonElifBlock } from './nodes/python_elif'
import { PythonElseBlock } from './nodes/python_else'
import { PythonExpression } from './nodes/python_expression'
import { PythonFile } from './nodes/python_file'
import { PythonForLoop } from './nodes/python_for'
import { PythonFromImport } from './nodes/python_from_import'
import { PythonFunctionDeclaration } from './nodes/python_function'
import { PythonIdentifier } from './nodes/python_identifier'
import { PythonIfStatement } from './nodes/python_if'
import { PythonImport } from './nodes/python_import'
import { PythonKeyValue } from './nodes/python_keyvalue'
import { PythonKeywordArgument } from './nodes/python_keyword_argument'
import { PythonList } from './nodes/python_list'
import { PythonMember } from './nodes/python_member'
import { PythonModuleIdentifier } from './nodes/python_module_identifier'
import { PythonNumberLiteral } from './nodes/literals'
import { PythonReturn } from './nodes/python_return'
import { PythonSet } from './nodes/python_set'
import { PythonStatement } from './nodes/python_statement'
import { PythonStringLiteral } from './nodes/python_string'
import { PythonSubscript } from './nodes/python_subscript'
import { PythonTuple } from './nodes/python_tuple'
import { PythonVariableReference } from './nodes/variable_reference'
import { PythonWhileLoop } from './nodes/python_while'
import { registerArgumentAutocompleters } from './nodes/scope_argument_autocompleter'
import { registerMemberAutocompleters } from './nodes/scope_member_autocompleter'
import { registerPythonAutocompleters } from './nodes/scope_autocompleter'
import { resolvePasteAdapters } from '@splootcode/core/language/type_registry'

export function loadTypes() {
  PythonStringLiteral.register()
  PythonNumberLiteral.register()

  PythonArgument.register()
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
  PythonKeywordArgument.register()
  PythonList.register()
  PythonMember.register()
  PythonModuleIdentifier.register()
  PythonReturn.register()
  PythonSet.register()
  PythonStatement.register()
  PythonSubscript.register()
  PythonTuple.register()
  PythonWhileLoop.register()
  registerPythonAutocompleters()
  registerMemberAutocompleters()
  registerArgumentAutocompleters()

  NoneLiteral.register()

  // Register deprecated types to provide paste adapters for deserialisation of legacy files/pastes.
  // They do not register into any NodeCategory and cannot be inserted.
  PythonDeclaredIdentifier.register()
  PythonVariableReference.register()

  // Must go at the end
  resolvePasteAdapters()
}
