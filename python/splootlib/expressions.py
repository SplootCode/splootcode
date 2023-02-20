import ast

def generateArgs(callNode):
    args = []
    keywords = []
    for arg in callNode["childSets"]["arguments"]:
        argValues = arg["childSets"]["argument"]
        if len(argValues) == 0:
            continue
        argValue = argValues[0]
        if argValue["type"] == 'PYTHON_EXPRESSION':
            args.append(generateAstExpression(argValue))
        elif argValue["type"] == 'PY_KWARG':
            name = argValue["properties"]["name"]
            expr = generateAstExpression(argValue["childSets"]["value"][0])
            kwarg = ast.keyword(arg=name, value=expr)
            keywords.append(kwarg)
    return (args, keywords)

def generateCallMember(node):
    args, keywords = generateArgs(node)
    object = generateAstExpressionToken(node["childSets"]["object"][0])
    member = node["properties"]["member"]
    memberExpr = ast.Attribute(object, member, ctx=ast.Load())
    callExpr = ast.Call(memberExpr, args=args, keywords=keywords)
    return callExpr

def generateCallVariable(node):
    args, keywords = generateArgs(node)
    varName = node["properties"]["identifier"]
    return ast.Call(ast.Name(varName, ctx=ast.Load()), args=args, keywords=keywords)

def generateMember(node):
    object = generateAstExpressionToken(node["childSets"]["object"][0])
    member = node["properties"]["member"]
    memberExpr = ast.Attribute(object, member, ctx=ast.Load())
    return memberExpr

def generateList(node):
    els = [generateAstExpression(el) for el in node['childSets']['elements']]
    els = [el for el in els if el is not None]
    return ast.List(els, ast.Load())

def generateTuple(node):
    els = [generateAstExpression(el) for el in node['childSets']['elements']]
    els = [el for el in els if el is not None]
    return ast.Tuple(els, ast.Load())

def generateSet(node):
    els = [generateAstExpression(el) for el in node['childSets']['elements']]
    els = [el for el in els if el is not None]
    return ast.Set(els)

def generateDict(node):
    kv_pairs = node['childSets']['elements']
    keys = [generateAstExpression(pair['childSets']['key'][0]) for pair in kv_pairs]
    values = [generateAstExpression(pair['childSets']['value'][0]) for pair in kv_pairs]
    return ast.Dict(keys, values)

def generateSubscript(node, context=ast.Load()):
    value = generateAstExpressionToken(node['childSets']['target'][0])
    index = generateAstExpression(node['childSets']['key'][0])
    return ast.Subscript(value, index, context)

def generateAstExpressionToken(node):
    if node["type"] == "PYTHON_CALL_VARIABLE":
        return generateCallVariable(node)
    elif node["type"] in ["STRING_LITERAL", "PYTHON_BOOL"]:
        return ast.Constant(node["properties"]["value"])
    elif node["type"] == "NUMERIC_LITERAL":
        num_val = node["properties"]["value"]
        try:
            return ast.Constant(int(num_val))
        except ValueError:
            return ast.Constant(float(num_val))
    elif node["type"] == "PYTHON_NONE":
        return ast.Constant(None)
    elif node["type"] == "PY_IDENTIFIER":
        identifier = node["properties"]["identifier"]
        return ast.Name(identifier, ctx=ast.Load())
    elif node["type"] == "PYTHON_CALL_MEMBER":
        return generateCallMember(node)
    elif node["type"] == "PYTHON_MEMBER":
        return generateMember(node)
    elif node["type"] == "PYTHON_LIST":
        return generateList(node)
    elif node["type"] == "PY_TUPLE":
        return generateTuple(node)
    elif node["type"] == "PY_SET":
        return generateSet(node)
    elif node["type"] == "PY_DICT":
        return generateDict(node)
    elif node["type"] == "PYTHON_SUBSCRIPT":
        return generateSubscript(node)
    elif node["type"] == "PY_BRACKET":
        return generateAstExpression(node['childSets']['expr'][0])
    else:
        raise Exception(f'Unrecognised expression token type: {node["type"]}')


def generateAstAssignableExpression(nodeList):
    targets = []
    for node in nodeList:
        if node["type"] == "PY_IDENTIFIER":
            identifier = node["properties"]["identifier"]
            targets.append(ast.Name(identifier, ctx=ast.Store()))
        elif node["type"] == "PYTHON_SUBSCRIPT":
            targets.append(generateSubscript(node, context=ast.Store()))
        else:
            raise Exception(f'Unrecognised assignable expression token: {node["type"]}')
    if len(targets) > 1:
        return ast.Tuple(targets, ast.Store())
    return targets[0]


def parseLeaf(tokens, currentIndex):
    if currentIndex >= len(tokens):
        print("Index out of bounds, attempting to parse leaf")
        return currentIndex

    lookahead = tokens[currentIndex]
    if lookahead["type"] == "PYTHON_BINARY_OPERATOR":
        op = lookahead["properties"]["operator"]
        if op in UNARY_OPERATORS:
            # treat RHS as it's own expression, depending on precedence.
            lhs, index = parseLeaf(tokens, currentIndex + 1)
            top_expr, index = parseExpression(
                lhs, tokens, index, getUnaryPrecedence(op)
            )
            # Create Unary expression
            return [ast.UnaryOp(getAstUnaryOperator(op), top_expr), index]
    return [generateAstExpressionToken(tokens[currentIndex]), currentIndex + 1]


UNARY_OPERATORS = {
    "not": {"precedence": 70, "ast": ast.Not()},
    "+": {"precedence": 150, "ast": ast.UAdd()},
    "-": {"precedence": 150, "ast": ast.USub()},
    "~": {"precedence": 150, "ast": ast.Invert()},  # Bitwise not
}

OPERATORS = {
    "or": {"precedence": 50, "ast": ast.Or()},
    "and": {"precedence": 60, "ast": ast.And()},
    "==": {"precedence": 80, "ast": ast.Eq()},
    "!=": {"precedence": 80, "ast": ast.NotEq()},
    ">=": {"precedence": 80, "ast": ast.GtE()},
    ">": {"precedence": 80, "ast": ast.Gt()},
    "<=": {"precedence": 80, "ast": ast.LtE()},
    "<": {"precedence": 80, "ast": ast.Lt()},
    "is not": {"precedence": 80, "ast": ast.IsNot()},
    "is": {"precedence": 80, "ast": ast.Is()},
    "not in": {"precedence": 80, "ast": ast.NotIn()},
    "in": {"precedence": 80, "ast": ast.In()},
    "|": {"precedence": 90, "ast": ast.BitOr()},
    "^": {"precedence": 100, "ast": ast.BitXor()},
    "&": {"precedence": 110, "ast": ast.BitAnd()},
    "<<": {"precedence": 120, "ast": ast.LShift()},
    ">>": {"precedence": 120, "ast": ast.RShift()},
    "+": {"precedence": 130, "ast": ast.Add()},
    "-": {"precedence": 130, "ast": ast.Sub()},
    "*": {"precedence": 140, "ast": ast.Mult()},
    "/": {"precedence": 140, "ast": ast.Div()},
    "//": {"precedence": 140, "ast": ast.FloorDiv()},
    "%": {"precedence": 140, "ast": ast.Mod()},
    "@": {"precedence": 140, "ast": ast.MatMult()},
    "**": {"precedence": 160, "ast": ast.Pow()},
}


def getAstOperator(stringOp):
    return OPERATORS[stringOp]["ast"]


def isBoolOp(stringOp):
    return stringOp in ["and", "or"]


def isCompareOp(stringOp):
    # Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn
    return stringOp in {
        "==",
        "!=",
        "<",
        "<=",
        ">",
        ">=",
        "is",
        "is not",
        "in",
        "not in",
    }


def getAstUnaryOperator(stringOp):
    return UNARY_OPERATORS[stringOp]["ast"]


def getBinaryPrecedence(op):
    return OPERATORS[op]["precedence"]


def getUnaryPrecedence(op):
    return UNARY_OPERATORS[op]["precedence"]


def parseExpression(lhs, tokens, currentIndex, minPrecedence):
    if currentIndex >= len(tokens):
        return [lhs, currentIndex]

    lookahead = tokens[currentIndex]
    while (
        lookahead is not None
        and lookahead["type"] == "PYTHON_BINARY_OPERATOR"
        and getBinaryPrecedence(lookahead["properties"]["operator"]) >= minPrecedence
    ):
        operator = lookahead["properties"]["operator"]
        operatorPrecedence = getBinaryPrecedence(operator)
        currentIndex += 1
        rhs, currentIndex = parseLeaf(tokens, currentIndex)
        if currentIndex < len(tokens):
            lookahead = tokens[currentIndex]
            while (
                lookahead is not None
                and lookahead["type"] == "PYTHON_BINARY_OPERATOR"
                and getBinaryPrecedence(lookahead["properties"]["operator"]) > operatorPrecedence
            ):
                lookaheadOp = lookahead["properties"]["operator"]
                [rhs, currentIndex] = parseExpression(
                    rhs, tokens, currentIndex, getBinaryPrecedence(lookaheadOp)
                )
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
    tokens = exp_node["childSets"]["tokens"]
    if len(tokens) == 0:
        return None
    lhs, index = parseLeaf(tokens, 0)
    top_expr, _ = parseExpression(lhs, tokens, index, 0)
    return top_expr
