import io
import contextlib
import unittest

from executor import executePythonFile, wrapStdout
from .convert_ast import splootFromPython 


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
            'add': [
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
