import unittest

from .convert_ast import splootFromPython 

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
                    "left":[{"type":"PYTHON_DECLARED_IDENTIFIER","properties":{"identifier":"name"},"childSets":{}}],
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
                                {"type":"PYTHON_VARIABLE_REFERENCE","properties":{"identifier":"name"},"childSets":{}}
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
                        "identifier": [{'type': 'PYTHON_DECLARED_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'add'}}],
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
                                                            {'type': 'PYTHON_VARIABLE_REFERENCE', 'childSets': {}, 'properties': {'identifier': 'a'}},
                                                            {'type': 'PYTHON_BINARY_OPERATOR', 'childSets': {}, 'properties': {'operator': '+'}},
                                                            {'type': 'PYTHON_VARIABLE_REFERENCE', 'childSets': {}, 'properties': {'identifier': 'b'}},
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
                            {'type': 'PYTHON_DECLARED_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'a'}},
                            {'type': 'PYTHON_DECLARED_IDENTIFIER', 'childSets': {}, 'properties': {'identifier': 'b'}}
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
