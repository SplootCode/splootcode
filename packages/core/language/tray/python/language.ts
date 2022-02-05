import { NumericLiteral, StringLiteral } from '../../types/literals'
import { PythonAssignment } from '../../types/python/python_assignment'
import { PythonBinaryOperator } from '../../types/python/python_binary_operator'
import { PythonCallVariable } from '../../types/python/python_call_variable'
import { PythonExpression } from '../../types/python/python_expression'
import { TrayCategory } from '../tray'

export const PythonLanugageTray: TrayCategory = {
  category: 'Python',
  entries: [
    {
      category: 'Console',
      entries: [
        {
          key: 'print',
          serializedNode: new PythonCallVariable(null, 'print', 1).serialize(),
          abstract: 'The print function will display values to the console',
        },
        {
          key: 'input',
          serializedNode: new PythonCallVariable(null, 'input', 1).serialize(),
          abstract: '',
        },
      ],
    },
    {
      category: 'Variables',
      entries: [
        {
          key: 'assign',
          serializedNode: new PythonAssignment(null).serialize(),
          abstract: '',
        },
      ],
    },
    {
      category: 'Strings',
      entries: [
        {
          key: 'string',
          serializedNode: new StringLiteral(null, '').serialize(),
          abstract: '',
        },
        {
          key: 'concat',
          serializedNode: new PythonBinaryOperator(null, '+').serialize(),
          abstract: '',
        },
        {
          category: 'Case',
          entries: [],
        },
      ],
    },
    {
      category: 'Numbers',
      entries: [
        {
          key: 'int literal',
          serializedNode: new NumericLiteral(null, 123).serialize(),
          title: 'Integer',
          abstract: 'Represents a number, can be any number including negative numbers.',
        },
        {
          key: 'int',
          serializedNode: new PythonCallVariable(null, 'int', 1).serialize(),
          abstract: 'Convert something else into an integer (int).',
        },
        {
          key: 'float literal',
          serializedNode: new NumericLiteral(null, 2.5).serialize(),
          title: 'Float',
          abstract: 'Short for floating-point number, this represents a decimal number.',
        },
        {
          key: 'float',
          serializedNode: new PythonCallVariable(null, 'float', 1).serialize(),
          abstract: 'Convert something else into a decimal number (float).',
        },
        {
          key: 'add',
          serializedNode: new PythonBinaryOperator(null, '+').serialize(),
          title: 'Add',
          abstract: 'Adds two numbers together.',
        },
        {
          key: 'subtract',
          serializedNode: new PythonBinaryOperator(null, '-').serialize(),
          title: 'Subtract',
          abstract: 'Subtracts the number on the right from the number on the left.',
        },
        {
          key: 'multiply',
          serializedNode: new PythonBinaryOperator(null, '*').serialize(),
          title: 'Multiply',
          abstract: 'Multiplies numbers together.',
        },
        {
          key: 'divide',
          serializedNode: new PythonBinaryOperator(null, '/').serialize(),
          title: 'Divide',
          abstract: 'Mathematical division, the left side is divided by the right side.',
        },
        {
          key: 'floordivision',
          serializedNode: new PythonBinaryOperator(null, '//').serialize(),
          title: 'Floor Divide',
          abstract: 'Like division, but only returns whole numbers.',
        },
        {
          key: 'mod',
          serializedNode: new PythonBinaryOperator(null, '%').serialize(),
          title: 'Modulo',
          abstract: 'The remainder when the number on the left is divided by the number on the right.',
          examples: [
            {
              serializedNode: (() => {
                const exp = new PythonExpression(null)
                const tokens = exp.getTokenSet()
                tokens.addChild(new NumericLiteral(null, 5))
                tokens.addChild(new PythonBinaryOperator(null, '%'))
                tokens.addChild(new NumericLiteral(null, 3))
                return exp.serialize()
              })(),
              description: '5 divided by 3 has a remainder of 2.',
            },
            {
              serializedNode: (() => {
                const exp = new PythonExpression(null)
                const tokens = exp.getTokenSet()
                tokens.addChild(new NumericLiteral(null, 9))
                tokens.addChild(new PythonBinaryOperator(null, '%'))
                tokens.addChild(new NumericLiteral(null, 2))
                tokens.addChild(new PythonBinaryOperator(null, '=='))
                tokens.addChild(new NumericLiteral(null, 0))
                return exp.serialize()
              })(),
              description:
                '9 divided by 2 has a remainder of 1. This is a userful way to check if a number is odd or even.',
            },
          ],
        },
      ],
    },
    { category: 'Logic', entries: [] },
    { category: 'Control', entries: [] },
    { category: 'Collections', entries: [] },
    { category: 'Functions', entries: [] },
  ],
}
