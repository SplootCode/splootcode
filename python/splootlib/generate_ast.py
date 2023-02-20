import ast

from .expressions import generateAstExpression, generateAstAssignableExpression

SPLOOT_KEY = "__spt__"
iterationLimit = None


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
    target = generateAstAssignableExpression(assign_node["childSets"]["left"])
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

def generateFromImportStatement(import_node):
    moduleName = import_node['childSets']['module'][0]['properties']['identifier']
    attrNames = []
    for attrNode in import_node['childSets']['attrs']:
        attrNames.append(ast.alias(attrNode['properties']['identifier']))

    statements = [ast.ImportFrom(moduleName, attrNames, 0)]

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
    statements.insert(0, ast.Expr(import_start_frame, lineno=1, col_offset=0))

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

    statements = getStatementsFromBlock(if_node["childSets"]["trueblock"])

    else_statements = []
    if "elseblocks" in if_node["childSets"] and len(if_node["childSets"]["elseblocks"]) != 0:
        else_statements = generateElifNestedChain(if_node["childSets"]["elseblocks"])
        else_statements.insert(0, startChildSetStatement('elseblocks'))

    statements.insert(0, startChildSetStatement('trueblock'))

    return [
        ast.If(wrapped_condition, statements, else_statements),
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


def generateForStatement(for_node):
    target = generateAstAssignableExpression(for_node["childSets"]["target"])
    iterable = generateAstExpression(for_node["childSets"]["iterable"][0])
    iterable = iterableLogExpressionResultAndStartFrame('PYTHON_FOR_LOOP_ITERATION', 'iterable', iterable)
    blockStatements = getStatementsFromBlock(for_node["childSets"]["block"])
    if len(blockStatements) == 0:
        blockStatements = [ast.Pass()]

    blockStatements.insert(0, startChildSetStatement('block'))
    blockStatements.append(endFrame())

    return [
        startFrameStatement('PYTHON_FOR_LOOP', 'frames'),
        ast.For(target, iterable, blockStatements, []),
        endFrame()
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

    statements.insert(0, startChildSetStatement('block'))
    statements.append(endFrame())

    return [
        startFrameStatement('PYTHON_WHILE_LOOP', 'frames'),
        ast.While(wrapped_condition, statements, []),
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

def generateFunctionStatement(func_node):
    nameIdentifier = func_node['childSets']['identifier'][0]['properties']['identifier']
    func_id = func_node['properties']['id']

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(
        value=key, attr="startDetachedFrame", ctx=ast.Load()
    )
    args = [
        ast.Constant("PYTHON_FUNCTION_CALL"),
        ast.Constant("body"),
        ast.Constant(func_id)
    ]
    call_start_frame = ast.Call(func, args, keywords=[])
    
    statements = getStatementsFromBlock(func_node["childSets"]["body"])

    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="endFrame", ctx=ast.Load())
    call_end_frame = ast.Call(func, args=[], keywords=[])

    statements.insert(0, ast.Expr(call_start_frame, lineno=1, col_offset=0))
    statements.append(ast.Expr(call_end_frame, lineno=1, col_offset=0))

    funcArgs = generateFunctionArguments(func_node['childSets']['params'])
    
    return [ast.FunctionDef(nameIdentifier, funcArgs, statements, [])]


def generateReturnStatement(return_node):
    ret_expr = generateAstExpression(return_node['childSets']['value'][0])
    if ret_expr is None:
        ret_expr = ast.Constant(None)
    key = ast.Name(id=SPLOOT_KEY, ctx=ast.Load())
    func = ast.Attribute(value=key, attr="logExpressionResultAndEndFrames", ctx=ast.Load())
    args = [ast.Constant("PYTHON_RETURN"), ast.Constant("PYTHON_FUNCTION_CALL"), ret_expr]
    wrapped = ast.Call(func, args=args, keywords=[])
    return [
        ast.Return(wrapped)
    ]

def generateBreakStatement(node):
    return [
        endLoop(),
        ast.Break()
    ]

def generateContinueStatement(node):
    return [
        endLoop(),
        ast.Continue()
    ]

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
    elif sploot_node["type"] == "PYTHON_FROM_IMPORT":
        return generateFromImportStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_ASSIGNMENT":
        return [generateAssignmentStatement(sploot_node)]
    elif sploot_node["type"] == "PYTHON_IF_STATEMENT":
        return generateIfStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_WHILE_LOOP":
        return generateWhileStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_FOR_LOOP":
        return generateForStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_FUNCTION_DECLARATION":
        return generateFunctionStatement(sploot_node)
    elif sploot_node["type"] == "PYTHON_RETURN":
        return generateReturnStatement(sploot_node)
    elif sploot_node["type"] == "PY_BREAK":
        return generateBreakStatement(sploot_node)
    elif sploot_node["type"] == "PY_CONTINUE":
        return generateContinueStatement(sploot_node)
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
        self.detachedFrames = {}
        self.sideEffects = []

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
        self.detachedFrames.setdefault(id, [])
        self.detachedFrames[id].append(frame)
        self.stack.append(frame)

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

    def logException(self, exceptionType, message):
        self.stack[-1].addExceptionResult(exceptionType, message)

    def toDict(self):
        cap = {"root": self.root.toDict(), "detached": {}}
        for id in self.detachedFrames:
            cap['detached'][id] = [context.toDict() for context in self.detachedFrames[id]]
        return cap
