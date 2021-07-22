import ast
import sys


def generateAstExpressionToken(node):
    if node['type'] == 'PYTHON_CALL_VARIABLE':
        args = []
        for argExp in node['childSets']['arguments']:
            args.append(generateAstExpression(argExp))
        varName = node['properties']['identifier']
        return ast.Call(ast.Name(varName, ctx=ast.Load()), args=args, keywords=[])
    elif node['type'] == 'STRING_LITERAL':
        return ast.Constant(node['properties']['value'])
    elif node['type'] == 'NUMERIC_LITERAL':
        return ast.Constant(node['properties']['value'])
    elif node['type'] == 'PYTHON_VARIABLE_REFERENCE':
        identifier = node['properties']['identifier']
        return ast.Name(identifier, ctx=ast.Load())
    elif node['type'] == 'PYTHON_DECLARED_IDENTIFIER':
        identifier = node['properties']['identifier']
        return ast.Name(identifier, ctx=ast.Store())

def generateAstAssignableExpression(node):
    if node['type'] == 'PYTHON_VARIABLE_REFERENCE':
        identifier = node['properties']['identifier']
        return ast.Name(identifier, ctx=ast.Store())
    elif node['type'] == 'PYTHON_DECLARED_IDENTIFIER':
        identifier = node['properties']['identifier']
        return ast.Name(identifier, ctx=ast.Store())

def parseLeaf(tokens, currentIndex):
    if currentIndex >= len(tokens):
        print('Index out of bounds, attempting to parse leaf')
        return

    lookahead = tokens[currentIndex]
    if (lookahead['type'] == 'PYTHON_BINARY_OPERATOR'):
        op = lookahead['properties']['operator']
        if op in UNARY_OPERATORS:
            # treat RHS as it's own expression, depending on precedence.
            lhs, index = parseLeaf(tokens, currentIndex + 1)
            top_expr, index = parseExpression(lhs, tokens, index, getUnaryPrecedence(op))
            # Create Unary expression
            return [ast.UnaryOp(getAstUnaryOperator(op), top_expr), index]
    return [generateAstExpressionToken(tokens[currentIndex]), currentIndex + 1]


UNARY_OPERATORS = {
    'not': {'precedence': 70, 'ast': ast.Not()},
    '+': {'precedence': 150, 'ast': ast.UAdd()},
    '-': {'precedence': 150, 'ast': ast.USub()},
    '~': {'precedence': 150, 'ast': ast.Invert()}, # Bitwise not
}

OPERATORS = {
    'or': {'precedence': 50, 'ast': ast.Or()},
    'and': {'precedence': 60, 'ast': ast.And()},
    '==': {'precedence': 80, 'ast': ast.Eq()},
    '!=': {'precedence': 80, 'ast': ast.NotEq()},
    '>=': {'precedence': 80, 'ast': ast.GtE()},
    '>': {'precedence': 80, 'ast': ast.Gt()},
    '<=': {'precedence': 80, 'ast': ast.LtE()},
    '<': {'precedence': 80, 'ast': ast.Lt()},
    'is not': {'precedence': 80, 'ast': ast.IsNot()},
    'is': {'precedence': 80, 'ast': ast.Is()},
    'not in': {'precedence': 80, 'ast': ast.NotIn()},
    'in': {'precedence': 80, 'ast': ast.In()},
    '|': {'precedence': 90, 'ast': ast.BitOr()},
    '^': {'precedence': 100, 'ast': ast.BitXor()},
    '&': {'precedence': 110, 'ast': ast.BitAnd()},
    '<<': {'precedence': 120, 'ast': ast.LShift()},
    '<<': {'precedence': 120, 'ast': ast.LShift()},
    '>>': {'precedence': 120, 'ast': ast.RShift()},
    '+': {'precedence': 130, 'ast': ast.Add()},
    '-': {'precedence': 130, 'ast': ast.Sub()},
    '*': {'precedence': 140, 'ast': ast.Mult()},
    '/': {'precedence': 140, 'ast': ast.Div()},
    '//': {'precedence': 140, 'ast': ast.FloorDiv()},
    '%': {'precedence': 140, 'ast': ast.Mod()},
    '@': {'precedence': 140, 'ast': ast.MatMult()},
    '**': {'precedence': 160, 'ast': ast.Pow()},
}

def getAstOperator(stringOp):
    return OPERATORS[stringOp]['ast']

def isBoolOp(stringOp):
    return stringOp in ['and', 'or']

def isCompareOp(stringOp):
    # Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn
    return stringOp in {'==', '!=', '<', '<=', '>', '>=', 'is', 'is not', 'in', 'not in'}

def getAstUnaryOperator(stringOp):
    return UNARY_OPERATORS[stringOp]['ast']

def getBinaryPrecedence(op):
    return OPERATORS[op]['precedence']

def getUnaryPrecedence(op):
    return UNARY_OPERATORS[op]['precedence']

def parseExpression(lhs, tokens, currentIndex, minPrecedence):
    if currentIndex >= len(tokens):
        return [lhs, currentIndex]
    
    lookahead = tokens[currentIndex]
    while (lookahead is not None
           and lookahead['type'] == 'PYTHON_BINARY_OPERATOR'
           and getBinaryPrecedence(lookahead['properties']['operator']) >= minPrecedence):
        operator = lookahead['properties']['operator']
        operatorPrecedence = getBinaryPrecedence(operator)
        currentIndex += 1
        rhs, currentIndex = parseLeaf(tokens, currentIndex)
        if currentIndex < len(tokens):
            lookahead = tokens[currentIndex]
            while (lookahead is not None
                   and lookahead['type'] == 'PYTHON_BINARY_OPERATOR'
                   and getBinaryPrecedence(lookahead['properties']['operator']) >= operatorPrecedence):
                lookaheadOp = lookahead['properties']['operator']
                [rhs, currentIndex] = parseExpression(rhs, tokens, currentIndex, getBinaryPrecedence(lookaheadOp))
                if currentIndex < len(tokens):
                    lookahead = tokens[currentIndex]
                else:
                    lookahead = None
        else:
            lookahead = None
        if isBoolOp(operator):
            lhs = ast.BoolOp(getAstOperator(operator), [lhs, rhs])
        elif isCompareOp(operator):
            # TODO: Support mutiple comparators, e.g. a < b < c
            lhs = ast.Compare(lhs, [getAstOperator(operator)], [rhs])
        else:
            lhs = ast.BinOp(lhs, getAstOperator(operator), rhs)
    return [lhs, currentIndex]
  

def generateAstExpression(exp_node):
    tokens = exp_node['childSets']['tokens']
    if len(tokens) == 0:
        return None
    lhs, index = parseLeaf(tokens, 0)
    top_expr, _ = parseExpression(lhs, tokens, index, 0)
    return top_expr


def generateAstExpressionStatement(exp_node):
    top_expr = generateAstExpression(exp_node)
    if not top_expr:
        return None
    expr = ast.Expr(value=top_expr, lineno=1, col_offset=0)
    return expr

def generateAssignmentStatement(assign_node):
    target = generateAstAssignableExpression(assign_node['childSets']['left'][0])
    value = generateAstExpression(assign_node['childSets']['right'][0])
    return ast.Assign([target], value)

def getStatementsFromBlock(blockChildSet):
    statements = []
    for node in blockChildSet:
        statement = generateAstStatement(node)
        if statement:
            statements.append(statement)
    return statements

def generateIfStatement(if_node):
    condition = generateAstExpression(if_node['childSets']['condition'][0])
    statements = getStatementsFromBlock(if_node['childSets']['trueblock'])
    return ast.If(condition, statements, [])

def generateWhileStatement(while_node):
    condition = generateAstExpression(while_node['childSets']['condition'][0])
    statements = getStatementsFromBlock(while_node['childSets']['block'])
    return ast.While(condition, statements, [])

def generateForStatement(for_node):
    target = generateAstAssignableExpression(for_node['childSets']['target'][0])
    iterable = generateAstExpression(for_node['childSets']['iterable'][0])
    statements = getStatementsFromBlock(for_node['childSets']['block'])
    return ast.For(target, iterable, statements, [])

def generateAstStatement(sploot_node):
    if sploot_node['type'] == 'PYTHON_EXPRESSION':
        exp = generateAstExpressionStatement(sploot_node)
        return exp
    elif sploot_node['type'] == 'PYTHON_ASSIGNMENT':
        return generateAssignmentStatement(sploot_node)
    elif sploot_node['type'] == 'PYTHON_IF_STATEMENT':
        return generateIfStatement(sploot_node)
    elif sploot_node['type'] == 'PYTHON_WHILE_LOOP':
        return generateWhileStatement(sploot_node)
    elif sploot_node['type'] == 'PYTHON_FOR_LOOP':
        return generateForStatement(sploot_node)
    else:
        print('Error: Unrecognised statement type: ', sploot_node['type'])
        return None


def executePythonFile(tree):
    if (tree['type'] == 'PYTHON_FILE'):
        statements = getStatementsFromBlock(tree['childSets']['body'])
        mods = ast.Module(body=statements, type_ignores=[])
        code = compile(ast.fix_missing_locations(mods), '<string>', mode='exec')
        exec(code)


if __name__ == '__main__':
    nodetree = {
        "type":"PYTHON_FILE",
        "properties":{},
        "childSets":{
            "body":[
                {"type":"PYTHON_EXPRESSION",
                "properties":{},
                "childSets":{
                    "tokens":[
                        {"type":"PYTHON_CALL_VARIABLE",
                        "properties":{"identifier":"print"},
                        "childSets":{"arguments":[
                            {"type":"SPLOOT_EXPRESSION",
                            "properties":{},
                            "childSets":{
                                "tokens":[
                                    {"type":"STRING_LITERAL",
                                    "properties":{"value":"Hello, World!"},
                                    "childSets":{}}
                                ]
                            }},
                            {"type":"PYTHON_EXPRESSION",
                            "properties":{},
                            "childSets":{
                                "tokens":[
                                    {"type":"NUMERIC_LITERAL",
                                    "properties":{"value":123},
                                    "childSets":{}},
                                    {"type":"PYTHON_BINARY_OPERATOR",
                                    "properties":{"operator":"*"},
                                    "childSets":{}},
                                    {"type":"NUMERIC_LITERAL",
                                    "properties":{"value":1000},
                                    "childSets":{}},
                                    {"type":"PYTHON_BINARY_OPERATOR",
                                    "properties":{"operator":"+"},
                                    "childSets":{}},
                                    {"type":"NUMERIC_LITERAL",
                                    "properties":{"value":12},
                                    "childSets":{}},
                                    {"type":"PYTHON_BINARY_OPERATOR",
                                    "properties":{"operator":"*"},
                                    "childSets":{}},
                                    {"type":"NUMERIC_LITERAL",
                                    "properties":{"value":1000},
                                    "childSets":{}},
                                ]
                            }}
                        ]}}
                    ]
                }}
            ]
        }
    }
    executePythonFile(nodetree)
else:
    import fakeprint # pylint: disable=import-error
    import nodetree # pylint: disable=import-error

    sys.stdout = fakeprint.stdout
    sys.stderr = fakeprint.stdout

    tree = nodetree.getNodeTree() # pylint: disable=undefined-variable
    executePythonFile(tree)