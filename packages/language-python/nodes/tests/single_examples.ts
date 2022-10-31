import { NoneLiteral, PythonBool, PythonNumberLiteral } from '../literals'
import { PythonAssignment } from '../python_assignment'
import { PythonBinaryOperator } from '../python_binary_operator'
import { PythonBrackets } from '../python_brackets'
import { PythonBreak } from '../python_break'
import { PythonCallMember } from '../python_call_member'
import { PythonCallVariable } from '../python_call_variable'
import { PythonContinue } from '../python_continue'
import { PythonDictionary } from '../python_dictionary'
import { PythonExpression } from '../python_expression'
import { PythonForLoop } from '../python_for'
import { PythonFromImport } from '../python_from_import'
import { PythonFunctionDeclaration } from '../python_function'
import { PythonIdentifier } from '../python_identifier'
import { PythonIfStatement } from '../python_if'
import { PythonImport } from '../python_import'
import { PythonList } from '../python_list'
import { PythonMember } from '../python_member'
import { PythonNode } from '../python_node'
import { PythonReturn } from '../python_return'
import { PythonSet } from '../python_set'
import { PythonStringLiteral } from '../python_string'
import { PythonSubscript } from '../python_subscript'
import { PythonTuple } from '../python_tuple'
import { PythonWhileLoop } from '../python_while'
import { SplootNode } from '@splootcode/core'

export function getEmptyStatementNodes(): PythonNode[] {
  return [
    new PythonAssignment(null),
    new PythonBreak(null),
    new PythonContinue(null),
    new PythonExpression(null),
    new PythonForLoop(null),
    new PythonFromImport(null),
    new PythonFunctionDeclaration(null),
    new PythonIfStatement(null),
    new PythonImport(null),
    new PythonReturn(null),
    new PythonWhileLoop(null),
  ]
}

export function getExpressionTokenNodes(): SplootNode[] {
  return [
    // Literals
    new PythonBool(null, true),
    new PythonBool(null, false),
    new NoneLiteral(null),
    new PythonStringLiteral(null, 'hello'),
    new PythonStringLiteral(null, ''),
    new PythonNumberLiteral(null, '0'),
    new PythonNumberLiteral(null, '12398293'),
    new PythonNumberLiteral(null, '0.234'),
    new PythonNumberLiteral(null, '934892384493.234343434'),
    new PythonNumberLiteral(null, '9348923844932348349389483'),

    // Identifier
    new PythonIdentifier(null, 'name'),

    // Operators/maths
    new PythonBinaryOperator(null, '+'),
    new PythonBinaryOperator(null, '//'),
    new PythonBinaryOperator(null, '/'),
    new PythonBinaryOperator(null, 'not in'),
    new PythonBinaryOperator(null, 'not'),
    new PythonBinaryOperator(null, 'is not'),
    new PythonBinaryOperator(null, 'and'),
    new PythonBrackets(null),

    // others
    new PythonCallMember(null),
    new PythonCallVariable(null, 'print'),
    new PythonMember(null),
    new PythonList(null),
    new PythonTuple(null),
    new PythonSet(null),
    new PythonDictionary(null),
    new PythonSubscript(null),
  ]
}
