import io
import contextlib
import unittest

from executor import executePythonFile, wrapStdout
from convert_ast import splootFromPython


class LoopAnnotationsTest(unittest.TestCase):

    def testWhileLoop(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
count = 0
while count < 3:
    count = count + 1
print(count)
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
                    },
                    {
                        'type': 'PYTHON_EXPRESSION',
                        'data':  {'result': 'None', 'resultType': 'NoneType'},
                        'sideEffects': [{'type': 'stdout', 'value':'3'}, {'type': 'stdout', 'value':'\n'}]
                    },
                ]
            }
        },
        'detached': {}})


    def testForLoop(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
for char in 'hello':
    print(char)
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
                    {
                        'type': 'PYTHON_FOR_LOOP',
                        'data': {'frames': [
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'h', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'h'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'e', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'e'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'l', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'l'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'l', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'l'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'o', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'o'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            }
                        ]},
                    }
                ]
            }
        },
        'detached': {}})


    def testBreak(self):
        self.maxDiff = None
        splootFile = splootFromPython('''
for char in 'hello':
    if char == 'l':
        break
    print(char)
print('end')
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
                    {
                        'type': 'PYTHON_FOR_LOOP',
                        'data': {'frames': [
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'h', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_IF_STATEMENT',
                                        'data': {'condition': [{'data': {'result': 'False', 'resultType':'bool'}}]},
                                    },{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'h'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'e', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_IF_STATEMENT',
                                        'data': {'condition': [{'data': {'result': 'False', 'resultType':'bool'}}]},
                                    },{
                                        'type': 'PYTHON_EXPRESSION',
                                        'data': {'result': 'None', 'resultType': 'NoneType'},
                                        'sideEffects': [{'type': 'stdout', 'value':'e'}, {'type': 'stdout', 'value':'\n'}]
                                    }],
                                },
                            },
                            {
                                'type': 'PYTHON_FOR_LOOP_ITERATION',
                                'data':{
                                    'iterable': [{'data': {'result': 'l', 'resultType': 'str'}}],
                                    'block': [{
                                        'type': 'PYTHON_IF_STATEMENT',
                                        'data': {
                                            'condition': [{'data': {'result': 'True', 'resultType':'bool'}}],
                                            'trueblock': []},
                                    }],
                                },
                            },
                        ]},
                    },
                    {
                        'type': 'PYTHON_EXPRESSION',
                        'data': {'result': 'None', 'resultType': 'NoneType'},
                        'sideEffects': [{'type': 'stdout', 'value':'end'}, {'type': 'stdout', 'value':'\n'}]
                    },
                ]
            }
        },
        'detached': {}})

