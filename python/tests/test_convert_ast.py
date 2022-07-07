import unittest

from convert_ast import splootFromPython 

HELLO_NAME_SPLOOT = {
    "type":"PYTHON_FILE",
    "properties":{},
    "childSets":{
        "body":[
            {"type":"PYTHON_STATEMENT","properties":{},"childSets":{"statement":[
                {"type":"PYTHON_EXPRESSION","properties":{},"childSets":{
                    "tokens":[
                        {"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"print"},
                        "childSets":{"arguments":[
                            {"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[
                                {"type":"STRING_LITERAL","properties":{"value":"Hello!"},"childSets":{}}
                            ]}}
                        ]}}
                    ]
                }}
            ]}},
            {"type":"PYTHON_STATEMENT","properties":{},"childSets":{"statement":[
                {"type":"PYTHON_ASSIGNMENT","properties":{},"childSets":{
                    "left":[{"type":"PY_IDENTIFIER","properties":{"identifier":"name"},"childSets":{}}],
                    "right":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{
                        "tokens":[{"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"input"},"childSets":{
                            "arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{
                                "tokens":[{"type":"STRING_LITERAL","properties":{"value":"What is your name? "},"childSets":{}}]
                            }}]
                        }}]
                    }}]
                }},
        ]}},
            {"type":"PYTHON_STATEMENT","properties":{},"childSets":{"statement":[
                {"type":"PYTHON_EXPRESSION","properties":{},"childSets":{
                    "tokens":[
                        {"type":"PYTHON_CALL_VARIABLE","properties":{"identifier":"print"},"childSets":{
                            "arguments":[{"type":"PYTHON_EXPRESSION","properties":{},"childSets":{"tokens":[
                                {"type":"STRING_LITERAL","properties":{"value":"Hello, "},"childSets":{}},
                                {"type":"PYTHON_BINARY_OPERATOR","properties":{"operator":"+"},"childSets":{}},
                                {"type":"PY_IDENTIFIER","properties":{"identifier":"name"},"childSets":{}}
                            ]}}]
                        }}
                    ]
                }}
            ]}},
        ]
    }
}

HELLO_NAME_CODE = '''
print('Hello!')
name = input('What is your name? ')
print('Hello, ' + name)
'''


class ParseTest(unittest.TestCase):
    def testEmptyCode(self):
        pythonFileNode = splootFromPython('')
        self.assertEqual(pythonFileNode, {
            'type': 'PYTHON_FILE',
            'childSets': {'body': []},
            'properties': {}
        })

    def testHelloName(self):
        self.maxDiff = None
        fileNode = splootFromPython(HELLO_NAME_CODE)
        self.assertEqual(fileNode, HELLO_NAME_SPLOOT)

    def testFunction(self):
        self.maxDiff = None
        fileNode = splootFromPython('''
def add(a, b):
    print(a + b)
add(3, 4)
''')
        self.assertEqual(fileNode, {
"type":"PYTHON_FILE",
"properties":{},
"childSets":{
    "body": [
        {
            "type": "PYTHON_STATEMENT",
            "childSets": {
                "statement": [{
                    "type": "PYTHON_FUNCTION_DECLARATION",
                    "properties": {'id': None},
                    "childSets": {
                        "identifier": [{'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'add'}}],
                        "body": [
                            {
                                "type": "PYTHON_STATEMENT",
                                "childSets": {
                                    "statement": [{
                                        "type": "PYTHON_EXPRESSION",
                                        "properties": {},
                                        "childSets": {
                                            "tokens": [
                                                {"type": "PYTHON_CALL_VARIABLE",
                                                'properties': {'identifier': 'print'},
                                                "childSets": {
                                                    "arguments": [
                                                        {"type": "PYTHON_EXPRESSION", "properties": {}, "childSets": {'tokens': [
                                                            {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'a'}},
                                                            {'type': 'PYTHON_BINARY_OPERATOR', 'childSets': {}, 'properties': {'operator': '+'}},
                                                            {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'b'}},
                                                        ]}},
                                                    ]
                                                }}
                                            ],
                                        }
                                    }]
                                },
                                "properties": {}
                            }
                        ],
                        "params": [
                            {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'a'}},
                            {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'b'}}
                        ]
                    }
                }]
            },
            "properties": {}
        },
        {
            "type": "PYTHON_STATEMENT",
            "childSets": {
                "statement": [{
                    "type": "PYTHON_EXPRESSION",
                    "properties": {},
                    "childSets": {
                        "tokens": [
                            {"type": "PYTHON_CALL_VARIABLE", 'properties': {'identifier': 'add'}, 'childSets':{
                                'arguments': [
                                    {"type": "PYTHON_EXPRESSION", "properties": {}, "childSets": {
                                        'tokens': [{'type': 'NUMERIC_LITERAL', 'childSets': {}, 'properties': {'value': 3}}]
                                    }},
                                    {"type": "PYTHON_EXPRESSION", "properties": {}, "childSets": {
                                        'tokens': [{'type': 'NUMERIC_LITERAL', 'childSets': {}, 'properties': {'value': 4}}]
                                    }},
                                ]
                            }}
                        ],
                    }
                }]
            },
            "properties": {}
        }
    ]
}
})

    def testList(self):
        self.maxDiff = None

        fileNode = splootFromPython('x = ["hello", 234]')
        self.assertEqual(fileNode, {
"type":"PYTHON_FILE",
"properties":{},
"childSets":{
    "body": [
        {
            "type": "PYTHON_STATEMENT",
            "childSets": {
                "statement": [{
                    "type": 'PYTHON_ASSIGNMENT',
                    "childSets": {
                        "left": [{
                            "type": "PY_IDENTIFIER",
                            "childSets": {},
                            "properties": {"identifier": 'x'}
                        }],
                        "right": [{
                            "type": "PYTHON_EXPRESSION",
                            "childSets": {
                                "tokens": [
                                    {
                                        "type": "PYTHON_LIST",
                                        "childSets": {
                                            "elements": [
                                                {
                                                    "type": "PYTHON_EXPRESSION",
                                                    "childSets": {
                                                        "tokens": [{"type": "STRING_LITERAL", "childSets": {}, "properties": {"value": "hello"}}]
                                                    },
                                                    "properties": {}
                                                },
                                                {
                                                    "type": "PYTHON_EXPRESSION",
                                                    "childSets": {
                                                        "tokens": [{"type": "NUMERIC_LITERAL", "childSets": {}, "properties": {"value": 234}}]
                                                    },
                                                    "properties": {}
                                                },
                                            ]
                                        },
                                        "properties": {}
                                    }
                                ]
                            },
                            "properties": {}
                        }]
                    },
                    "properties": {}
                }]
            },
            "properties": {},
        }
    ]
}})

    def testImport(self):
        self.maxDiff = None

        fileNode = splootFromPython('import random')
        self.assertEqual(fileNode, {
            'type': 'PYTHON_FILE',
            'childSets': {
                'body': [
                    {
                        'type': 'PYTHON_IMPORT',
                        'childSets': {
                            'modules': [
                                {'type': 'PYTHON_MODULE_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'random'},}
                            ]
                        },
                        'properties': {},
                    }
                ]
            },
            'properties': {},
        })


    def testImportFrom(self):
        self.maxDiff = None

        fileNode = splootFromPython('from random import randint')
        self.assertEqual(fileNode, {
            'type': 'PYTHON_FILE',
            'childSets': {'body': [
                {
                    'type': 'PYTHON_FROM_IMPORT',
                    'childSets': {
                        'attrs': [
                            {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'randint'}}
                        ],
                        'module': [
                            {'type': 'PYTHON_MODULE_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'random'}}
                        ]
                    },
                    'properties': {},
                }
            ]},
            'properties': {},
        })

    def testTuple(self):
        self.maxDiff = None
        fileNode = splootFromPython('x = ()\n("hi",)\n("a", "b")')
        self.assertEqual(fileNode, {
            'type': 'PYTHON_FILE',
            'childSets': {'body': [
                {
                    'type': 'PYTHON_STATEMENT',
                    'childSets': {'statement': [
                            {'type': 'PYTHON_ASSIGNMENT', 'childSets': {
                                'left': [
                                    {'type': 'PY_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'x'}}
                                ],
                                'right': [
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'PY_TUPLE', 'childSets': {'elements': [
                                            {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': []}, 'properties': {}}
                                        ]}, 'properties': {}}
                                    ]}, 'properties': {}}
                                ],
                            }, 'properties': {}}
                    ]},
                    'properties': {},
                },
                {
                    'type': 'PYTHON_STATEMENT',
                    'childSets': {'statement': [
                            {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                {'type': 'PY_TUPLE', 'childSets': {'elements': [
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'hi'}, 'childSets': {}}
                                    ]}, 'properties': {}}
                                ]}, 'properties': {}}
                            ]}, 'properties': {}}
                    ]},
                    'properties': {},
                },
                {
                    'type': 'PYTHON_STATEMENT',
                    'childSets': {'statement': [
                            {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                {'type': 'PY_TUPLE', 'childSets': {'elements': [
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'a'}, 'childSets': {}}
                                    ]}, 'properties': {}},
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'b'}, 'childSets': {}}
                                    ]}, 'properties': {}}
                                ]}, 'properties': {}}
                            ]}, 'properties': {}}
                    ]},
                    'properties': {},
                },
            ]},
            'properties': {},
        })

    def testSet(self):
        self.maxDiff = None
        fileNode = splootFromPython('{"hi"}\n{"a", "b"}')
        self.assertEqual(fileNode, {
            'type': 'PYTHON_FILE',
            'childSets': {'body': [
                {
                    'type': 'PYTHON_STATEMENT',
                    'childSets': {'statement': [
                            {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                {'type': 'PY_SET', 'childSets': {'elements': [
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'hi'}, 'childSets': {}}
                                    ]}, 'properties': {}}
                                ]}, 'properties': {}}
                            ]}, 'properties': {}}
                    ]},
                    'properties': {},
                },
                {
                    'type': 'PYTHON_STATEMENT',
                    'childSets': {'statement': [
                            {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                {'type': 'PY_SET', 'childSets': {'elements': [
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'a'}, 'childSets': {}}
                                    ]}, 'properties': {}},
                                    {'type': 'PYTHON_EXPRESSION', 'childSets': {'tokens': [
                                        {'type': 'STRING_LITERAL', 'properties': {'value': 'b'}, 'childSets': {}}
                                    ]}, 'properties': {}}
                                ]}, 'properties': {}}
                            ]}, 'properties': {}}
                    ]},
                    'properties': {},
                },
            ]},
            'properties': {},
        })
