import io
import contextlib
import unittest

from executor import executePythonFile, wrapStdout
from convert_ast import splootFromPython 


class ExecuteTest(unittest.TestCase):
    def testHelloWorld(self):
        splootFile = splootFromPython('print("Hello, World!")')
        
        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
            'root': {
                'type': 'PYTHON_FILE',
                'data': {
                    'body': [
                        {
                            'type': 'PYTHON_EXPRESSION',
                            'data': {'result': 'None', 'resultType': 'NoneType'},
                            'sideEffects': [
                                {"type": "stdout", "value": 'Hello, World!'},
                                {"type": "stdout", "value": '\n'},
                            ]
                        }
                    ]
                }
            },
            'detached': {}})
        
        self.assertEqual(f.getvalue(), "Hello, World!\n")


    def testIfElse(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
x = 10
if x == 10:
    print('hi')
else:
    print('bye')
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
            'root': {
                'type': 'PYTHON_FILE',
                'data': {
                    'body': [
                        {'type': 'PYTHON_ASSIGNMENT', 'data': {'result': '10', 'resultType': 'int'}},
                        {'type': 'PYTHON_IF_STATEMENT', 'data': {
                            'condition': [{'data': {'result': 'True', 'resultType': 'bool'}}],
                            'trueblock': [{
                                'type': 'PYTHON_EXPRESSION',
                                'data': {'result': 'None', 'resultType': 'NoneType'},
                                'sideEffects': [{'type': 'stdout', 'value':'hi'},{'type': 'stdout', 'value':'\n'}]
                            }]
                        }},
                    ]
                }
            },
            'detached': {}})

    def testElse(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
x = 10
if x != 10:
    print('hi')
else:
    print('bye')
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
            'root': {
                'type': 'PYTHON_FILE',
                'data': {
                    'body': [
                        {'type': 'PYTHON_ASSIGNMENT', 'data': {'result': '10', 'resultType': 'int'}},
                        {
                            'type': 'PYTHON_IF_STATEMENT',
                            'data': {
                                'condition': [{'data': {'result': 'False', 'resultType': 'bool'}}],
                                'elseblocks': [{
                                    'type': 'PYTHON_ELSE_STATEMENT',
                                    'data': {
                                        'block': [
                                            {'type': 'PYTHON_EXPRESSION',
                                            'data': {'result': 'None', 'resultType': 'NoneType'},
                                            'sideEffects': [{'type': 'stdout', 'value':'bye'},{'type': 'stdout', 'value':'\n'}]}
                                        ]
                                    }}
                            ]}
                        },
                    ]
                }
            },
            'detached': {}})


    def testFunctionDeclaration(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
def add(a, b):
    print(a + b)
add(3, 4)
add(123, 45)
''')
        # Set ID on function node:
        self.assertIsNone(splootFile['childSets']['body'][0]['childSets']['statement'][0]['properties']['id'])
        splootFile['childSets']['body'][0]['childSets']['statement'][0]['properties']['id'] = "TEST_FUNC_ID"

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
        'root': {
            'type': 'PYTHON_FILE',
            'data': {
                'body': [
                    {'type': 'PYTHON_EXPRESSION', 'data': {'result': 'None','resultType': 'NoneType'}},
                    {'type': 'PYTHON_EXPRESSION', 'data': {'result': 'None','resultType': 'NoneType'}},
                ]
            }
        },
        'detached': {
            'TEST_FUNC_ID': [
                {
                    'type': 'PYTHON_FUNCTION_CALL',
                    'data': {
                        'body': [{
                            'type': 'PYTHON_EXPRESSION',
                            'data': {'result': 'None','resultType': 'NoneType'},
                            'sideEffects': [{'type': 'stdout', 'value': '7'}, {'type': 'stdout', 'value': '\n'}],
                        }]
                    },
                },
                {
                    'type': 'PYTHON_FUNCTION_CALL',
                    'data': {
                        'body': [{
                            'type': 'PYTHON_EXPRESSION',
                            'data': {'result': 'None','resultType': 'NoneType'},
                            'sideEffects': [{'type': 'stdout', 'value': '168'}, {'type': 'stdout', 'value': '\n'}],
                        }]
                    },
                }
            ]
        }})

    def testList(self):
        self.maxDiff = None
        splootFile = splootFromPython('''x = ['hello', 123]''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
            'root': {
                'type': 'PYTHON_FILE',
                'data': {
                    'body': [
                        {
                            'type': 'PYTHON_ASSIGNMENT',
                            'data': {'result': "['hello', 123]", 'resultType': 'list'}
                        }
                    ]
                }
            },
            'detached': {}
        })

    def testExpressionParsing(self):
        splootFile = splootFromPython('''print(100 + 10 + 10 + 4 * 3 * 2 + 10 + 10)''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), '164\n')

    def testExpressionParsingOrderOfOperations(self):
        splootFile = splootFromPython('''print(100 * 100 == 10000)''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), 'True\n')

    def testExpressionParsingBooleanOrderOfOperations(self):
        # If the OR is evaluated first, it'll come out False.
        splootFile1 = splootFromPython('print(True or True and False)\n'
                                       'print(1 == 1 or 2 == 3 and 1 == 2)\n'
                                       'print(False and 5 == 4)\n'
                                       # 4 Layers of increasing precedence scores
                                       'print(True and 22 == 12 + 1 * 10)')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile1)

        f.seek(0)
        self.assertEqual(f.read(), 'True\nTrue\nFalse\nTrue\n')

    def testExpressionParsingDefaultsLeftToRight(self):
        splootFile = splootFromPython('''print(100 / 10 / 5)\nprint(100 // 10 // 5)''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), '2.0\n2\n')

    def testBreak(self):
        splootFile = splootFromPython('''
x = 10
while x > 0:
    x = x - 1
    if x == 8:
        print('continuing')
        continue
    print(x)
    if x == 5:
        print('breaking')
        break
print('hi')
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), '''9
continuing
7
6
5
breaking
hi
''')

    def testDict(self):
        splootFile = splootFromPython('''d = {"hello": "hallo"}
print(d)
print(d["hello"])
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "{'hello': 'hallo'}\nhallo\n")

    def testMemberExpression(self):
        splootFile = splootFromPython('''d = 12
print(str(d.numerator) + '/' + str(d.denominator))
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "12/1\n")

    def testTuples(self):
        splootFile = splootFromPython('''x = ()
y = ('hi',)
z = ("a", 'b')
print(x, y, z)
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "() ('hi',) ('a', 'b')\n")

    def testSets(self):
        splootFile = splootFromPython('''x = {1, 2, 1, 1}
y = set()
z = {"a", 'b'}
print(x, y, z)
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        # Order is not guaranteed for a set
        self.assertIn(f.read(), [
            "{1, 2} set() {'a', 'b'}\n",
            "{1, 2} set() {'b', 'a'}\n",
            "{2, 1} set() {'a', 'b'}\n",
            "{2, 1} set() {'b', 'a'}\n",
        ])

    def testDictionaryAssignment(self):
        splootFile = splootFromPython('''x = {}
x['fred'] = 'blogs'
x[('foo', 'bar')] = ['list', 'of', 'things']
print(x)
''')

        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "{'fred': 'blogs', ('foo', 'bar'): ['list', 'of', 'things']}\n")

    def testKwargs(self):
        splootFile = splootFromPython('''print('hello', 'there', sep="--", end="END")''')
        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "hello--thereEND")

    def testMethodCall(self):
        splootFile = splootFromPython('''x = 'hello'\nx = x.replace('lo', 'LO')\nprint(x)''')
        f = io.StringIO()
        f.write = wrapStdout(f.write)
        with contextlib.redirect_stdout(f):
            executePythonFile(splootFile)

        f.seek(0)
        self.assertEqual(f.read(), "helLO\n")
