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
    
    def testWhileLoop(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
count = 0
while count < 3:
    count = count + 1
''')
        cap = executePythonFile(splootFile)

        self.assertEqual(cap, {
        'root': {
            'type': 'PYTHON_FILE',
            'data': {
                'body': [
                    {
                        'type': 'PYTHON_ASSIGNMENT',
                        'data': {'result': '0', 'resultType': 'int'}
                    },
                    {
                        'type': 'PYTHON_WHILE_LOOP',
                        'data': {'frames': [
                            {
                                'type': 'PYTHON_WHILE_LOOP_ITERATION',
                                'data':{
                                    'condition': [{'data': {'result': 'True', 'resultType': 'bool'}}],
                                    'block': [{'type': 'PYTHON_ASSIGNMENT', 'data': {'result': '1', 'resultType': 'int'}}],
                                },
                            },
                            {
                                'type': 'PYTHON_WHILE_LOOP_ITERATION',
                                'data':{
                                    'condition': [{'data': {'result': 'True', 'resultType': 'bool'}}],
                                    'block': [{'type': 'PYTHON_ASSIGNMENT', 'data': {'result': '2', 'resultType': 'int'}}],
                                },
                            },
                            {
                                'type': 'PYTHON_WHILE_LOOP_ITERATION',
                                'data':{
                                    'condition': [{'data': {'result': 'True', 'resultType': 'bool'}}],
                                    'block': [{'type': 'PYTHON_ASSIGNMENT', 'data': {'result': '3', 'resultType': 'int'}}],
                                },
                            },
                            {
                                'type': 'PYTHON_WHILE_LOOP_ITERATION',
                                'data':{
                                    'condition': [{'data': {'result': 'False', 'resultType': 'bool'}}],
                                },
                            }
                        ]},
                    }
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