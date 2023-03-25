import ast
import sys
import json
import re

import ast
import ast_comments

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
    expr = ast.Expr(value=top_expr, lineno=1, col_offset=0)
    return expr


def generateAssignmentStatement(assign_node):
    target = generateAstAssignableExpression(assign_node["childSets"]["left"])
    value = generateAstExpression(assign_node["childSets"]["right"][0])
    return ast.Assign([target], value)


def getStatementsFromBlock(blockChildSet, insert_pass=True):
    statements = []
    for node in blockChildSet:
        new_statements = generateAstStatement(node)
        if new_statements:
            statements.extend(new_statements)

    # If all nodes in this block are comments, add a pass statement
    if insert_pass and not any(not isinstance(s, ast_comments.Comment) for s in statements):
        statements.append(ast.Pass())
    return statements


def generateIfStatementFromElif(elif_node, else_nodes):
    condition = generateAstExpression(elif_node["childSets"]["condition"][0])

    statements = getStatementsFromBlock(elif_node["childSets"]["block"])

    else_statements = []
    if len(else_nodes) != 0:
        else_statements = generateElifNestedChain(else_nodes)

    return [
        ast.If(condition, statements, else_statements),
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
    return statements

def generateFromImportStatement(import_node):
    moduleName = import_node['childSets']['module'][0]['properties']['identifier']
    attrNames = []
    for attrNode in import_node['childSets']['attrs']:
        attrNames.append(ast.alias(attrNode['properties']['identifier']))
    statements = [ast.ImportFrom(moduleName, attrNames, 0)]
    return statements

def generateImportStatement(import_node):
    aliases = []
    moduleNames = import_node['childSets']['modules']
    for moduleName in moduleNames:
        aliases.append(ast.alias(moduleName['properties']['identifier']))
    statements = [ast.Import(aliases)]
    return statements

def generateIfStatement(if_node):
    condition = generateAstExpression(if_node["childSets"]["condition"][0])
    statements = getStatementsFromBlock(if_node["childSets"]["trueblock"])

    else_statements = []
    if "elseblocks" in if_node["childSets"] and len(if_node["childSets"]["elseblocks"]) != 0:
        else_statements = generateElifNestedChain(if_node["childSets"]["elseblocks"])

    return [
        ast.If(condition, statements, else_statements),
    ]


def generateForStatement(for_node):
    target = generateAstAssignableExpression(for_node["childSets"]["target"])
    iterable = generateAstExpression(for_node["childSets"]["iterable"][0])
    blockStatements = getStatementsFromBlock(for_node["childSets"]["block"])
    if len(blockStatements) == 0:
        blockStatements = [ast.Pass()]
    return [
        ast.For(target, iterable, blockStatements, []),
    ]

def generateWhileStatement(while_node):
    condition = generateAstExpression(while_node["childSets"]["condition"][0])
    statements = getStatementsFromBlock(while_node["childSets"]["block"])

    return [
        ast.While(condition, statements, []),
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
    statements = getStatementsFromBlock(func_node["childSets"]["body"])
    decorators = []
    if 'decorators' in func_node['childSets']:
        decorators = [generateAstExpression(dec['childSets']['expression'][0]) for dec in func_node['childSets']['decorators']]
    funcArgs = generateFunctionArguments(func_node['childSets']['params'])
    return [ast.FunctionDef(nameIdentifier, funcArgs, statements, decorators)]


def generateReturnStatement(return_node):
    ret_expr = generateAstExpression(return_node['childSets']['value'][0])
    if ret_expr is None:
        ret_expr = ast.Constant(None)
    return [
        ast.Return(ret_expr)
    ]

def generateBreakStatement(node):
    return [
        ast.Break()
    ]

def generateContinueStatement(node):
    return [
        ast.Continue()
    ]

def generateAstStatement(sploot_node):
    if sploot_node["type"] == "PYTHON_STATEMENT":
        if len(sploot_node['childSets']['statement']) != 0:
            return generateAstStatement(sploot_node['childSets']['statement'][0])
        return [ast_comments.Comment("##SPLOOTCODEEMPTYLINE")]
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
        return [ast_comments.Comment('# ' + sploot_node['properties']['value'])]
    else:
        print("Error: Unrecognised statement type: ", sploot_node["type"])
        return None

empty_lines = re.compile('^\s*##SPLOOTCODEEMPTYLINE$', flags=re.MULTILINE)

def convertSplootToText(tree: dict) -> str:
    if tree["type"] != "PYTHON_FILE":
      raise Exception("Invalid file type")

    statements = getStatementsFromBlock(tree["childSets"]["body"], insert_pass=False)

    mods = ast.Module(body=statements, type_ignores=[])
    ast.fix_missing_locations(mods)
    code_string = ast_comments.unparse(mods)
    code_string = re.sub(empty_lines, '', code_string)
    return code_string


result = None
if __name__  == '__main__':
    import nodetree
    tree = nodetree.getNodeTree()  # pylint: disable=undefined-variable
    result = convertSplootToText(tree)

# Must be last line to return result to pyodide
result