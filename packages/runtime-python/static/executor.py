import ast
import sys
import json
import traceback


SPLOOT_KEY = "__spt__"


def generateCallMember(node):
    args = []
    for argExp in node["childSets"]["arguments"]:
        exp = generateAstExpression(argExp)
        if exp is not None:
            args.append(generateAstExpression(argExp))

    object = generateAstExpressionToken(node["childSets"]["object"][0])
    member = node["properties"]["member"]
    memberExpr = ast.Attribute(object, member, ctx=ast.Load())
    callExpr = ast.Call(memberExpr, args=args, keywords=[])
    return callExpr

def generateAstExpressionToken(node):
    if node["type"] == "PYTHON_CALL_VARIABLE":
        args = []
        for argExp in node["childSets"]["arguments"]:
            exp = generateAstExpression(argExp)
            if exp is not None:
                args.append(generateAstExpression(argExp))
        varName = node["properties"]["identifier"]
        return ast.Call(ast.Name(varName, ctx=ast.Load()), args=args, keywords=[])
    elif node["type"] in ["STRING_LITERAL", "NUMERIC_LITERAL", "PYTHON_BOOL"]:
        return ast.Constant(node["properties"]["value"])
    elif node["type"] == "PYTHON_NONE":
        return ast.Constant(None)
    elif node["type"] == "PYTHON_VARIABLE_REFERENCE":
        identifier = node["properties"]["identifier"]
        return ast.Name(identifier, ctx=ast.Load())
    elif node["type"] == "PYTHON_DECLARED_IDENTIFIER":
        identifier = node["properties"]["identifier"]
        return ast.Name(identifier, ctx=ast.Store())
    elif node["type"] == "PYTHON_CALL_MEMBER":
        return generateCallMember(node)
    else:
        raise Exception(f'Unrecognised node type: {node["type"]}')


def generateAstAssignableExpression(node):
    if node["type"] == "PYTHON_VARIABLE_REFERENCE":
        identifier = node["properties"]["identifier"]
        return ast.Name(identifier, ctx=ast.Store())
    elif node["type"] == "PYTHON_DECLARED_IDENTIFIER":
        identifier = node["properties"]["identifier"]
        return ast.Name(identifier, ctx=ast.Store())


def parseLeaf(tokens, currentIndex):
    if currentIndex >= len(tokens):
        print("Index out of bounds, attempting to parse leaf")
        return

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
                and getBinaryPrecedence(lookahead["properties"]["operator"])
                >= operatorPrecedence
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


def generateAstExpressionStatement(exp_node):
    top_expr = generateAstExpression(exp_node)
    if not top_expr:
        return None

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResult", ctx=ast.Load())
    args = [ast.Constant("PYTHON_EXPRESSION"), ast.Dict([], []), top_expr]
    wrapped = ast.Call(func, args=args, keywords=[])
    expr = ast.Expr(value=wrapped, lineno=1, col_offset=0)
    return expr


def generateAssignmentStatement(assign_node):
    target = generateAstAssignableExpression(assign_node["childSets"]["left"][0])
    value = generateAstExpression(assign_node["childSets"]["right"][0])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResult", ctx=ast.Load())
    args = [ast.Constant("PYTHON_ASSIGNMENT"), ast.Dict([], []), value]
    wrapped = ast.Call(func, args=args, keywords=[])
    return ast.Assign([target], wrapped)


def getStatementsFromBlock(blockChildSet):
    statements = []
    for node in blockChildSet:
        new_statements = generateAstStatement(node)
        if new_statements:
            statements.extend(new_statements)
    return statements


def generateIfStatementFromElif(elif_node, else_nodes):
    condition = generateAstExpression(elif_node["childSets"]["condition"][0])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
    )
    args = [
        ast.Constant("PYTHON_ELIF_STATEMENT"),
        ast.Constant("condition"),
        condition,
    ]
    wrapped_condition = ast.Call(func, args=args, keywords=[])

    statements = getStatementsFromBlock(elif_node["childSets"]["block"])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])

    else_statements = []
    if len(else_nodes) != 0:
        else_statements = generateElifNestedChain(else_nodes)
    
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
        ast.If(wrapped_condition, statements, else_statements),
    ]
    

def generateElifNestedChain(else_nodes):
    if len(else_nodes) == 1 and else_nodes[0]["type"] == 'PYTHON_ELSE_STATEMENT':
        return generateElseStatement(else_nodes[0])

    first = else_nodes[0]
    if first["type"] == 'PYTHON_ELIF_STATEMENT':
        return generateIfStatementFromElif(first, else_nodes[1:])
    elif first["type"] == "PYTHON_ELSE_STATEMENT":
        raise Exception(f'Unexpected else node in middle of else/elif chain')
    else:
        raise Exception(f'Unrecognised node type in elif/else chain: {first["type"]}')


def generateElseStatement(else_node):
    statements = getStatementsFromBlock(else_node["childSets"]["block"])

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


def generateImportStatement(import_node):
    aliases = []
    moduleNames = import_node['childSets']['modules']
    for moduleName in moduleNames:
        aliases.append(ast.alias(moduleName['properties']['identifier']))

    statements = [ast.Import(aliases)]

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
    statements.insert(0, ast.Expr(import_start_frame, lineno=1, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))
    return statements

def generateIfStatement(if_node):
    condition = generateAstExpression(if_node["childSets"]["condition"][0])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
    )
    args = [
        ast.Constant("PYTHON_IF_STATEMENT"),
        ast.Constant("condition"),
        condition,
    ]
    wrapped_condition = ast.Call(func, args=args, keywords=[])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])

    statements = getStatementsFromBlock(if_node["childSets"]["trueblock"])

    else_statements = []
    if "elseblocks" in if_node["childSets"] and len(if_node["childSets"]["elseblocks"]) != 0:
        else_statements = generateElifNestedChain(if_node["childSets"]["elseblocks"])
        key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
        func = ast.Attribute(value=key, attr="startChildSet", ctx=ast.Load())
        args = [ast.Constant("elseblocks")]
        call_start_childset = ast.Call(func, args=args, keywords=[])
        else_statements.insert(0, ast.Expr(call_start_childset, lineno=1, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startChildSet", ctx=ast.Load())
    args = [ast.Constant("trueblock")]
    call_start_childset = ast.Call(func, args=args, keywords=[])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])

    statements.insert(0, ast.Expr(call_start_childset, lineno=1, col_offset=0))

    return [
        ast.If(wrapped_condition, statements, else_statements),
        ast.Expr(call_end_frame, lineno=1, col_offset=0),
    ]


def generateWhileStatement(while_node):
    condition = generateAstExpression(while_node["childSets"]["condition"][0])
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="logExpressionResultAndStartFrame", ctx=ast.Load()
    )
    args = [
        ast.Constant("PYTHON_WHILE_LOOP_ITERATION"),
        ast.Constant("condition"),
        condition,
    ]
    wrapped_condition = ast.Call(func, args=args, keywords=[])

    statements = getStatementsFromBlock(while_node["childSets"]["block"])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startChildSet", ctx=ast.Load())
    args = [ast.Constant("block")]
    call_start_childset = ast.Call(func, args=args, keywords=[])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])

    statements.insert(0, ast.Expr(call_start_childset, lineno=1, col_offset=0))
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="startFrame", ctx=ast.Load())
    while_start_frame = ast.Call(
        func,
        args=[
            ast.Constant("PYTHON_WHILE_LOOP"),
            ast.Constant("frames"),
        ],
        keywords=[],
    )

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    while_end_frame = ast.Call(func, args=[], keywords=[])

    return [
        ast.Expr(while_start_frame, lineno=1, col_offset=0),
        ast.While(wrapped_condition, statements, []),
        ast.Expr(while_end_frame, lineno=1, col_offset=0),
        ast.Expr(while_end_frame, lineno=1, col_offset=0),
    ]


def generateForStatement(for_node):
    target = generateAstAssignableExpression(for_node["childSets"]["target"][0])
    iterable = generateAstExpression(for_node["childSets"]["iterable"][0])
    statements = getStatementsFromBlock(for_node["childSets"]["block"])
    return ast.For(target, iterable, statements, [])


def generateAstStatement(sploot_node):
    if sploot_node["type"] == "PYTHON_STATEMENT":
        if len(sploot_node['childSets']['statement']) != 0:
            return generateAstStatement(sploot_node['childSets']['statement'][0])
        return None
    elif sploot_node["type"] == "PYTHON_EXPRESSION":
        exp = generateAstExpressionStatement(sploot_node)
        return [exp]
    elif sploot_node["type"] == "PYTHON_IMPORT":
        return generateImportStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_ASSIGNMENT":
        return [generateAssignmentStatement(sploot_node)]
    elif sploot_node["type"] == "PYTHON_IF_STATEMENT":
        return generateIfStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_WHILE_LOOP":
        return generateWhileStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_FOR_LOOP":
        return [generateForStatement(sploot_node)]
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
        self.blocks[self.childset].append(
            {
                "type": type,
                "data": data,
                "sideEffects": sideEffects,
            }
        )

    def addExceptionResult(self, exceptionType, message):
        self.blocks[self.childset].append(
            {
                "type": "EXCEPTION",
                "exceptionType": exceptionType,
                "exceptionMessage": message,
            }
        )

    def checkFrameLimit(self):
        if iterationLimit and len(self.blocks[self.childset]) > iterationLimit:
            raise Exception('Too many iterations.')

    def toDict(self):
        return {
            "type": self.type,
            "data": self.blocks,
        }


class SplootCapture:
    def __init__(self):
        self.root = CaptureContext("PYTHON_FILE", "body")
        self.stack = [self.root]
        self.sideEffects = []

    def logExpressionResultAndStartFrame(self, nodetype, childset, result):
        self.startFrame(nodetype, childset)
        self.logExpressionResult(nodetype, {}, result)
        return result

    def startFrame(self, type, childset):
        frame = CaptureContext(type, childset)
        self.stack[-1].checkFrameLimit()
        self.stack[-1].addStatementResult(frame.type, frame.blocks, [])
        self.stack.append(frame)

    def startChildSet(self, childset):
        self.stack[-1].startChildSet(childset)

    def endFrame(self):
        frame = self.stack.pop()

    def logSideEffect(self, data):
        self.sideEffects.append(data)

    def logExpressionResult(self, nodetype, data, result):
        data["result"] = str(result)
        data["resultType"] = type(result).__name__
        self.stack[-1].addStatementResult(nodetype, data, self.sideEffects)
        self.sideEffects = []
        return result

    def logException(self, exceptionType, message):
        self.stack[-1].addExceptionResult(exceptionType, message)

    def toDict(self):
        return self.root.toDict()


capture = None


def executePythonFile(tree):
    global capture
    if tree["type"] == "PYTHON_FILE":
        statements = getStatementsFromBlock(tree["childSets"]["body"])
        mods = ast.Module(body=statements, type_ignores=[])
        code = compile(ast.fix_missing_locations(mods), "<string>", mode="exec")
        # Uncomment to print generated Python code
        # print(ast.unparse(ast.fix_missing_locations(mods)))
        # print()
        capture = SplootCapture()
        try:
            exec(code, {SPLOOT_KEY: capture})
        except EOFError as e:
            # This is because we don't have inputs in a rerun.
            capture.logException(type(e).__name__, str(e))
        except BaseException as e:
            capture.logException(type(e).__name__, str(e))
            traceback.print_exc()

        return capture.toDict()


if __name__ == "__main__":
    nodetree = {
        "type": "PYTHON_FILE",
        "properties": {},
        "childSets": {
            "body": [
                {
                    "type": "PYTHON_EXPRESSION",
                    "properties": {},
                    "childSets": {
                        "tokens": [
                            {
                                "type": "PYTHON_CALL_VARIABLE",
                                "properties": {"identifier": "print"},
                                "childSets": {
                                    "arguments": [
                                        {
                                            "type": "SPLOOT_EXPRESSION",
                                            "properties": {},
                                            "childSets": {
                                                "tokens": [
                                                    {
                                                        "type": "STRING_LITERAL",
                                                        "properties": {
                                                            "value": "Hello, World!"
                                                        },
                                                        "childSets": {},
                                                    }
                                                ]
                                            },
                                        },
                                        {
                                            "type": "PYTHON_EXPRESSION",
                                            "properties": {},
                                            "childSets": {
                                                "tokens": [
                                                    {
                                                        "type": "NUMERIC_LITERAL",
                                                        "properties": {"value": 123},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "PYTHON_BINARY_OPERATOR",
                                                        "properties": {"operator": "*"},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "NUMERIC_LITERAL",
                                                        "properties": {"value": 1000},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "PYTHON_BINARY_OPERATOR",
                                                        "properties": {"operator": "+"},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "NUMERIC_LITERAL",
                                                        "properties": {"value": 12},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "PYTHON_BINARY_OPERATOR",
                                                        "properties": {"operator": "*"},
                                                        "childSets": {},
                                                    },
                                                    {
                                                        "type": "NUMERIC_LITERAL",
                                                        "properties": {"value": 1000},
                                                        "childSets": {},
                                                    },
                                                ]
                                            },
                                        },
                                    ]
                                },
                            }
                        ]
                    },
                }
            ]
        },
    }
    executePythonFile(nodetree)
else:
    import fakeprint  # pylint: disable=import-error
    import nodetree  # pylint: disable=import-error
    import runtime_capture # pylint: disable=import-error

    # Only wrap stdout once.
    # Horrifying hack.
    try:
        wrapStdout
    except NameError:
        def wrapStdout(write):
            def f(s):
                if capture:
                    capture.logSideEffect({"type": "stdout", "value": str(s)})
                write(s)
            return f

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
    cap = executePythonFile(tree)
    if cap:
        runtime_capture.report(json.dumps(cap))
