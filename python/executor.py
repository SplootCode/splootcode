import ast
import sys
import json
import traceback
from typing import Tuple


SPLOOT_KEY = "__spt__"
SPLOOT_HANDLER_ARG="__spt__handler_arg__"
SPLOOT_SET_RESPONSE_FUNC="__spt__set_response__"

iterationLimit = None

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

def generateSlice(node, context=ast.Load()):
    value = generateAstExpressionToken(node['childSets']['target'][0])
    sliceRange = generateSliceRange(node['childSets']['slicerange'][0])
    return ast.Subscript(value, sliceRange, context)

def generateSliceRange(node):
    lower = generateAstExpression(node['childSets']['start'][0])
    upper = generateAstExpression(node['childSets']['end'][0])
    return ast.Slice(lower, upper, None)

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
    elif node["type"] == "PY_SLICE":
        return generateSlice(node)
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
            if isinstance(lhs, ast.Compare):
                lhs.ops.append(getAstOperator(operator))
                lhs.comparators.append(rhs)
            else:
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


def generateAstExpressionStatement(exp_node, traced, lineno):
    top_expr = generateAstExpression(exp_node)
    if not top_expr:
        return None

    if not traced:
        expr = ast.Expr(value=top_expr, lineno=lineno, col_offset=0)
        return expr

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResult", ctx=ast.Load())
    args = [ast.Constant("PYTHON_EXPRESSION"), ast.Dict([], []), top_expr]
    wrapped = ast.Call(func, args=args, keywords=[])
    expr = ast.Expr(value=wrapped, lineno=lineno, col_offset=0)
    return expr


def generateAssignmentStatement(assign_node, traced, lineno):
    target = generateAstAssignableExpression(assign_node["childSets"]["left"])
    value = generateAstExpression(assign_node["childSets"]["right"][0])
    if not traced:
        return ast.Assign([target], value, lineno=lineno)

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResult", ctx=ast.Load())
    args = [ast.Constant("PYTHON_ASSIGNMENT"), ast.Dict([], []), value]
    wrapped = ast.Call(func, args=args, keywords=[])
    return ast.Assign([target], wrapped, lineno=lineno)


def getStatementsFromBlock(blockChildSet, traced):
    statements = []
    for node in blockChildSet:
        new_statements = generateAstStatement(node, traced)
        if new_statements:
            statements.extend(new_statements)
    if len(statements) == 0:
        return [ast.Pass()]
    return statements


def generateIfStatementFromElif(elif_node, else_nodes, traced):
    condition = generateAstExpression(elif_node["childSets"]["condition"][0])
    lineno = 1
    if 'meta' in elif_node and 'lineno' in elif_node['meta']:
        lineno = elif_node['meta']['lineno']

    if traced:
        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(
            value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
        )
        args = [
            ast.Constant("PYTHON_ELIF_STATEMENT"),
            ast.Constant("condition"),
            condition,
        ]
        condition = ast.Call(func, args=args, keywords=[])

    statements = getStatementsFromBlock(elif_node["childSets"]["block"], traced)

    else_statements = []
    if len(else_nodes) != 0:
        else_statements = generateElifNestedChain(else_nodes, traced)

    if traced:
        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
        call_end_frame = ast.Call(func, args=[], keywords=[])

        # End the elif frame before starting the next else/elif block
        else_statements.insert(0, ast.Expr(call_end_frame, lineno=1, col_offset=0))

        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(value=key, attr="startChildSet", ctx=ast.Load())
        args = [ast.Constant("block")]
        call_start_childset = ast.Call(func, args=args, keywords=[])

        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
        call_end_frame = ast.Call(func, args=[], keywords=[])

        statements.insert(0, ast.Expr(call_start_childset, lineno=1, col_offset=0))
        statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))

    return [
        ast.If(condition, statements, else_statements, lineno=lineno),
    ]


def generateElifNestedChain(else_nodes, traced):
    if len(else_nodes) == 1 and else_nodes[0]["type"] == 'PYTHON_ELSE_STATEMENT':
        return generateElseStatement(else_nodes[0], traced)

    first = else_nodes[0]
    if first["type"] == 'PYTHON_ELIF_STATEMENT':
        return generateIfStatementFromElif(first, else_nodes[1:], traced)
    elif first["type"] == "PYTHON_ELSE_STATEMENT":
        raise Exception(f'Unexpected else node in middle of else/elif chain')
    else:
        raise Exception(f'Unrecognised node type in elif/else chain: {first["type"]}')


def generateElseStatement(else_node, traced):
    statements = getStatementsFromBlock(else_node["childSets"]["block"], traced)
    if not traced:
        return statements

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startFrame", ctx=ast.Load())
    else_start_frame = ast.Call(
        func,
        args=[
            ast.Constant("PYTHON_ELSE_STATEMENT"),
            ast.Constant("block"),
        ],
        keywords=[],
    )
    statements.insert(0, ast.Expr(else_start_frame, lineno=1, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))

    return statements

def generateFromImportStatement(import_node, traced, lineno):
    moduleName = import_node['childSets']['module'][0]['properties']['identifier']
    attrNames = []
    for attrNode in import_node['childSets']['attrs']:
        attrNames.append(ast.alias(attrNode['properties']['identifier']))

    statements = [ast.ImportFrom(moduleName, attrNames, 0)]
    if not traced:
        return statements

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startFrame", ctx=ast.Load())
    import_start_frame = ast.Call(
        func,
        args=[
            ast.Constant("PYTHON_FROM_IMPORT"),
            ast.Constant("import"),
        ],
        keywords=[],
    )
    statements.insert(0, ast.Expr(import_start_frame, lineno=lineno, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))
    return statements

def generateImportStatement(import_node, traced, lineno):
    aliases = []
    moduleNames = import_node['childSets']['modules']
    for moduleName in moduleNames:
        aliases.append(ast.alias(moduleName['properties']['identifier']))

    statements = [ast.Import(aliases)]
    if not traced:
        return statements

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startFrame", ctx=ast.Load())
    import_start_frame = ast.Call(
        func,
        args=[
            ast.Constant("PYTHON_IMPORT"),
            ast.Constant("import"),
        ],
        keywords=[],
    )
    statements.insert(0, ast.Expr(import_start_frame, lineno=lineno, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))
    return statements

def generateIfStatement(if_node, traced, lineno):
    condition = generateAstExpression(if_node["childSets"]["condition"][0])

    if traced:
        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(
            value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
        )
        args = [
            ast.Constant("PYTHON_IF_STATEMENT"),
            ast.Constant("condition"),
            condition,
        ]
        condition = ast.Call(func, args=args, keywords=[])

    statements = getStatementsFromBlock(if_node["childSets"]["trueblock"], traced)

    else_statements = []
    if "elseblocks" in if_node["childSets"] and len(if_node["childSets"]["elseblocks"]) != 0:
        else_statements = generateElifNestedChain(if_node["childSets"]["elseblocks"], traced)
        if traced:
            else_statements.insert(0, startChildSetStatement('elseblocks'))

    if not traced:
        return [ast.If(condition, statements, else_statements)]

    statements.insert(0, startChildSetStatement('trueblock'))
    return [
        ast.If(condition, statements, else_statements, lineno=lineno),
        endFrame(),
    ]


def startFrameStatement(nodeType, childSetName):
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startFrame", ctx=ast.Load())
    start_frame = ast.Call(
        func,
        args=[
            ast.Constant(nodeType),
            ast.Constant(childSetName),
        ],
        keywords=[],
    )
    return ast.Expr(start_frame, lineno=1, col_offset=0)


def logExpressionResultAndStartFrame(nodeType, childSet, expr):
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
    )
    args = [
        ast.Constant(nodeType),
        ast.Constant(childSet),
        expr,
    ]
    return ast.Call(func, args=args, keywords=[])

def iterableLogExpressionResultAndStartFrame(nodeType, childset, iterable):
    mapFunc = ast.Lambda(
        ast.arguments(posonlyargs=[], args=[ast.arg('x')], kwonlyargs=[], kw_defaults=[], defaults=[]),
        logExpressionResultAndStartFrame(nodeType, childset, ast.Name('x', ctx=ast.Load())))

    return ast.Call(ast.Name('map', ast.Load()), args=[mapFunc, iterable], keywords=[])

def endFrame():
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    return ast.Expr(call_end_frame, lineno=1, col_offset=0)

def endLoop():
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endLoop", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    return ast.Expr(call_end_frame, lineno=1, col_offset=0)


def startChildSetStatement(childSetName):
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startChildSet", ctx=ast.Load())
    args = [ast.Constant(childSetName)]
    call_start_childset = ast.Call(func, args=args, keywords=[])
    return ast.Expr(call_start_childset, lineno=1, col_offset=0)


def generateForStatement(for_node, traced, lineno):
    target = generateAstAssignableExpression(for_node["childSets"]["target"])
    iterable = generateAstExpression(for_node["childSets"]["iterable"][0])
    if traced:
        iterable = iterableLogExpressionResultAndStartFrame('PYTHON_FOR_LOOP_ITERATION', 'iterable', iterable)

    blockStatements = getStatementsFromBlock(for_node["childSets"]["block"], traced)
    if len(blockStatements) == 0:
        blockStatements = [ast.Pass()]

    if not traced:
        return [ast.For(target, iterable, blockStatements, [], lineno=lineno)]

    blockStatements.insert(0, startChildSetStatement('block'))
    blockStatements.append(endFrame())

    return [
        startFrameStatement('PYTHON_FOR_LOOP', 'frames'),
        ast.For(target, iterable, blockStatements, [], lineno=lineno),
        endFrame()
    ]


def generateWhileStatement(while_node, traced, lineno):
    condition = generateAstExpression(while_node["childSets"]["condition"][0])

    if traced:
        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(
            value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
        )
        args = [
            ast.Constant("PYTHON_WHILE_LOOP_ITERATION"),
            ast.Constant("condition"),
            condition,
        ]
        condition = ast.Call(func, args=args, keywords=[])

    statements = getStatementsFromBlock(while_node["childSets"]["block"], traced)
    if not traced:
        return statements

    statements.insert(0, startChildSetStatement('block'))
    statements.append(endFrame())

    return [
        startFrameStatement('PYTHON_WHILE_LOOP', 'frames'),
        ast.While(condition, statements, [], lineno=lineno),
        endLoop(),
        endFrame()
    ]

def generateFunctionArguments(arg_list):
    args = []
    for param in arg_list:
        name = param['properties']['identifier']
        args.append(ast.arg(name))
    return ast.arguments(
        posonlyargs=[],
        args=args,
        kwonlyargs=[],
        kw_defaults=[],
        defaults=[])

def generateTracedFunctionBlock(func_id, block_nodes):
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="func", ctx=ast.Load()
    )
    args = [
        ast.Constant(func_id)
    ]
    constructor = ast.Call(func, args, keywords=[])
    assign_node = ast.Assign([ast.Name('t', ast.Store())], constructor)
    traced_statements = getStatementsFromBlock(block_nodes, True)
    statements = getStatementsFromBlock(block_nodes, False)

    cap_expr = ast.Attribute(value=ast.Name('t', ast.Load()), attr="cap", ctx=ast.Load())
    if_node = ast.If(cap_expr, traced_statements, statements)

    with_node = ast.With([ast.withitem(ast.Name('t', ast.Load()))], [if_node])

    return [assign_node, with_node]

def generateFunctionStatement(func_node, traced, lineno):
    nameIdentifier = func_node['childSets']['identifier'][0]['properties']['identifier']
    func_id = func_node['properties']['id']
    decorators = [generateAstExpression(dec['childSets']['expression'][0]) for dec in func_node['childSets']['decorators']]

    if traced:
        statements = generateTracedFunctionBlock(func_id, func_node["childSets"]["body"])
    else:
        statements = getStatementsFromBlock(func_node["childSets"]["body"], traced)

    funcArgs = generateFunctionArguments(func_node['childSets']['params'])

    return [ast.FunctionDef(nameIdentifier, funcArgs, statements, decorators, lineno=lineno)]


def generateReturnStatement(return_node, traced, lineno):
    ret_expr = generateAstExpression(return_node['childSets']['value'][0])
    if ret_expr is None:
        ret_expr = ast.Constant(None)

    if not traced:
        return [ast.Return(ret_expr, lineno=lineno)]

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResult", ctx=ast.Load())
    args = [ast.Constant("PYTHON_RETURN"), ast.Dict([], []), ret_expr]
    wrapped = ast.Call(func, args=args, keywords=[])
    return [
        ast.Return(wrapped, lineno=lineno)
    ]

def generateBreakStatement(node, traced, lineno):
    if not traced:
        return [ast.Break(lineno=lineno)]

    return [
        endLoop(),
        ast.Break(lineno=lineno)
    ]

def generateContinueStatement(node, traced, lineno):
    if not traced:
        return [ast.Continue(lineno=lineno)]

    return [
        endLoop(),
        ast.Continue(lineno=lineno)
    ]

def generateAstStatement(sploot_node, traced):
    if sploot_node["type"] == "PYTHON_STATEMENT":
        if len(sploot_node['childSets']['statement']) != 0:
            lineno = 1
            if 'meta' in sploot_node and 'lineno' in sploot_node['meta']:
                lineno = sploot_node['meta']['lineno']
            return generateAstStatementContents(sploot_node['childSets']['statement'][0], traced, lineno)
        return None

def generateAstStatementContents(sploot_node, traced, lineno):
    if sploot_node["type"] == "PYTHON_STATEMENT":
        if len(sploot_node['childSets']['statement']) != 0:
            return generateAstStatement(sploot_node['childSets']['statement'][0], traced)
        return None
    elif sploot_node["type"] == "PYTHON_EXPRESSION":
        exp = generateAstExpressionStatement(sploot_node, traced, lineno)
        return [exp]
    elif sploot_node["type"] == "PYTHON_IMPORT":
        return generateImportStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_FROM_IMPORT":
        return generateFromImportStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_ASSIGNMENT":
        return [generateAssignmentStatement(sploot_node, traced, lineno),]
    elif sploot_node["type"] == "PYTHON_IF_STATEMENT":
        return generateIfStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_WHILE_LOOP":
        return generateWhileStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_FOR_LOOP":
        return generateForStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_FUNCTION_DECLARATION":
        return generateFunctionStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PYTHON_RETURN":
        return generateReturnStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PY_BREAK":
        return generateBreakStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PY_CONTINUE":
        return generateContinueStatement(sploot_node, traced, lineno)
    elif sploot_node["type"] == "PY_COMMENT":
        return None
    else:
        print("Error: Unrecognised statement type: ", sploot_node["type"])
        return None


class CaptureContext:
    def __init__(self, type, childset):
        self.type = type
        self.blocks = {childset: []}
        self.childset = childset

    def startChildSet(self, childset):
        self.childset = childset
        if childset not in self.blocks:
            self.blocks[childset] = []

    def addStatementResult(self, type, data, sideEffects):
        res = {"data": data}
        if type:
            res["type"] = type
        if sideEffects:
            res["sideEffects"] = sideEffects
        self.blocks[self.childset].append(res)

    def addExceptionResult(self, exceptionType, message, inFunction=None):
        exception_details = {
                "type": "EXCEPTION",
                "exceptionType": exceptionType,
                "exceptionMessage": message,
            }
        if inFunction:
            exception_details["exceptionInFunction"] = inFunction
        self.blocks[self.childset].append(exception_details)

    def checkFrameLimit(self):
        if iterationLimit and len(self.blocks[self.childset]) > iterationLimit:
            raise Exception('Too many iterations.')

    def toDict(self):
        return {
            "type": self.type,
            "data": self.blocks,
        }


class FunctionFrame:
    def __init__(self, capture, frame_no, func_id):
        self.capture = capture
        self.func_id = func_id
        self.frame_no = frame_no
        if frame_no > 100:
            self.cap = False
        else:
            self.cap = True

    def __enter__(self):
        if self.cap:
            self.capture.startDetachedFrame("PYTHON_FUNCTION_CALL", "body", self.func_id)

    def __exit__(self, exc_type, exc_value, exc_tb):
        if exc_type:
            if self.cap:
                self.capture.logTracedException(exc_value)
            self.capture.addExceptionFrame(self.func_id, self.frame_no, exc_tb.tb_lineno, exc_value)

        if self.cap:
            self.capture.endFrameType("PYTHON_FUNCTION_CALL")


class SplootCapture:
    def __init__(self):
        self.root = CaptureContext("PYTHON_FILE", "body")
        self.stack = [self.root]
        self.detachedFrames = {}
        self.detachedFramesCount = {}
        self.detachedFramesException = {}
        self.sideEffects = []
        self.lastException = None

    def func(self, func_id):
        self.detachedFrames.setdefault(func_id, [])
        self.detachedFramesCount.setdefault(func_id, 0)
        frames = self.detachedFrames[func_id]
        frameno =  self.detachedFramesCount[func_id]
        self.detachedFramesCount[func_id] = frameno + 1
        return FunctionFrame(self, frameno, func_id)

    def logExpressionResultAndStartFrame(self, nodetype, childset, result):
        self.startFrame(nodetype, childset)
        self.logExpressionResult(None, {}, result)
        return result

    def logExpressionResultAndEndFrames(self, nodetype, frameType, result):
        self.logExpressionResult(nodetype, {}, result)
        while frameType != self.stack[-1].type:
            self.endFrame()
        self.endFrame()
        return result

    def startDetachedFrame(self, type, childset, id):
        frame = CaptureContext(type, childset)
        self.detachedFrames[id].append(frame)
        self.stack.append(frame)

    def endFrameType(self, type):
        while type != self.stack[-1].type:
            self.endFrame()
        self.endFrame()

    def startFrame(self, type, childset):
        frame = CaptureContext(type, childset)
        self.stack[-1].checkFrameLimit()
        self.stack[-1].addStatementResult(frame.type, frame.blocks, [])
        self.stack.append(frame)

    def startChildSet(self, childset):
        self.stack[-1].startChildSet(childset)

    def endFrame(self):
        frame = self.stack.pop()

    def endLoop(self):
        while len(self.stack) != 0:
            frame = self.stack[-1]
            if frame.type == 'PYTHON_FOR_LOOP' or frame.type == 'PYTHON_WHILE_LOOP':
                break
            self.stack.pop()

    def logSideEffect(self, data):
        self.sideEffects.append(data)

    def logExpressionResult(self, nodetype, data, result):
        data["result"] = str(result)
        data["resultType"] = type(result).__name__
        self.stack[-1].addStatementResult(nodetype, data, self.sideEffects)
        self.sideEffects = []
        return result

    def addExceptionFrame(self, func_id, frameno, lineno, exception):
        key = exception
        if key not in self.detachedFramesException:
            self.detachedFramesException[key] = (func_id, frameno, lineno)

    def logTracedException(self, exception):
        exceptionType = str(type(exception).__name__)
        message = str(exception)
        traceback = exception.__traceback__.tb_next
        functionName = None
        if traceback and traceback.tb_frame.f_code.co_filename == 'main.py':
            functionName = traceback.tb_frame.f_code.co_name
        self.stack[-1].addExceptionResult(exceptionType, message, functionName)

    def logException(self, exception):
        exceptionType = str(type(exception).__name__)
        message = str(exception)
        traceback = exception.__traceback__.tb_next
        functionName = None
        if traceback.tb_next and traceback.tb_next.tb_frame.f_code.co_filename == 'main.py':
            functionName = traceback.tb_next.tb_frame.f_code.co_name
        self.stack[-1].addExceptionResult(exceptionType, message, functionName)

        self.lastException = {"type": exceptionType, "message": message}
        if exception in self.detachedFramesException:
            func_id, frameno, lineno = self.detachedFramesException[exception]
            self.lastException["func_id"] = func_id
            self.lastException["frameno"] = frameno
            self.lastException["lineno"] = lineno

    def toDict(self):
        cap = {"root": self.root.toDict(), "detached": {}}
        if self.lastException:
            cap["lastException"] = self.lastException
        for id in self.detachedFrames:
            cap['detached'][id] = {
                'count': self.detachedFramesCount[id],
                'frames': [context.toDict() for context in self.detachedFrames[id]]
            }
        return cap


capture = None
response = None


def executePythonFile(tree, runType="COMMAND_LINE", eventData=None) -> Tuple[dict, dict]:
    global capture
    global response

    if tree["type"] == "PYTHON_FILE":
        statements = getStatementsFromBlock(tree["childSets"]["body"], True)

        if runType == "COMMAND_LINE" or runType == "SCHEDULE":
            pass
        elif runType == "HTTP_REQUEST":
            # we need to parse our http scenario event into serverless_wsgi so
            if not eventData:
                raise Exception("Need an event to run a HTTP request")

            extra = ast.parse(f"""
import serverless_wsgi

flask_app = None

try:
    flask_app = app
except NameError:
    print("Please call your Flask app 'app'")

if flask_app:
    {SPLOOT_SET_RESPONSE_FUNC}(serverless_wsgi.handle_request(app, {SPLOOT_HANDLER_ARG}, {{}}))
            """)

            statements.extend(extra.body)
        else:
            raise NotImplementedError("This run type is not implemented: " + runType)

        mods = ast.Module(body=statements, type_ignores=[])
        code = compile(ast.fix_missing_locations(mods), "main.py", mode="exec")
        # Uncomment to print generated Python code
        # print(ast.unparse(ast.fix_missing_locations(mods)))
        # print(ast.dump(mods))

        capture = SplootCapture()
        response = {}

        def set_response(r):
            global response
            response = r

        try:
            exec(code, {SPLOOT_KEY: capture, '__name__': '__main__', SPLOOT_HANDLER_ARG: eventData, SPLOOT_SET_RESPONSE_FUNC: set_response})
        except EOFError as e:
            # This is because we don't have inputs in a rerun.
            capture.logException(e)
        except BaseException as e:
            capture.logException(e)
            traceback.print_exc()

        return (capture.toDict(), response)


def wrapStdout(write):
    def f(s):
        if capture:
            capture.logSideEffect({"type": "stdout", "value": str(s)})
        write(s)
    return f

if __name__ == "__main__":
    import fakeprint  # pylint: disable=import-error
    import nodetree  # pylint: disable=import-error
    import runtime_capture # pylint: disable=import-error
    import web_response # pylint: disable=import-error

    # Only wrap stdin/stdout once.
    # Horrifying hack.
    try:
        wrapStdin
    except NameError:
        def wrapStdin(readline):
            def f():
                runtime_capture.report(json.dumps(capture.toDict()))
                return readline()
            return f

        fakeprint.stdout.write = wrapStdout(fakeprint.stdout.write)
        fakeprint.stdin.readline = wrapStdin(fakeprint.stdin.readline)

    sys.stdout = fakeprint.stdout
    sys.stderr = fakeprint.stdout
    sys.stdin = fakeprint.stdin

    tree = nodetree.getNodeTree()  # pylint: disable=undefined-variable
    iterationLimit = nodetree.getIterationLimit()
    runType = nodetree.getRunType()
    eventData = nodetree.getEventData()
    cap, response = executePythonFile(tree, runType, eventData)
    if cap:
        runtime_capture.report(json.dumps(cap))
    if response:
        web_response.report(json.dumps(response))
