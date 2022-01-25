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
