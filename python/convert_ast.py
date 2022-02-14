from re import S
from executor import OPERATORS, UNARY_OPERATORS
import ast

AST_OPERATORS = {type(value["ast"]): key for key, value in OPERATORS.items()}
UNARY_AST_OPERATORS = {type(value["ast"]): key for key, value in UNARY_OPERATORS.items()}


def convertOperator(astOp):
  if type(astOp) in AST_OPERATORS:
    return AST_OPERATORS[type(astOp)]
  if type(astOp) in UNARY_AST_OPERATORS:
    return UNARY_AST_OPERATORS[type(astOp)]

def SplootNode(type, childSets={}, properties={}):
  return {
    "type": type,
    "childSets": childSets,
    "properties": properties
  }

def generateAssignmentTarget(targets):
  if len(targets) != 1:
    raise Exception("Unsupported: multiple targets for assignment")
  target = targets[0]
  if type(target) == ast.Name:
    return SplootNode('PY_IDENTIFIER', {}, {"identifier": target.id})
  
  raise Exception(f"Unsupported target for assignment: {ast.dump(target)}")

def generateAssignment(assignStatement):
  return SplootNode("PYTHON_ASSIGNMENT", {
    "left": [generateAssignmentTarget(assignStatement.targets)],
    "right": [generateExpression(assignStatement.value)],
  })

def appendCallToken(callExpr, tokens):
  arguments = [generateExpression(arg) for arg in callExpr.args]
  if len(arguments) == 0:
    arguments = [SplootNode("PYTHON_EXPRESSION", {'tokens':[]})]

  if type(callExpr.func) == ast.Name:
    name = callExpr.func.id
    tokens.append(SplootNode('PYTHON_CALL_VARIABLE', {"arguments":arguments}, {"identifier": name}))
  elif type(callExpr.func) == ast.Attribute:
    attr = callExpr.func
    obj = generateExpressionTokens(attr.value)
    node = SplootNode('PYTHON_CALL_MEMBER', {'arguments': arguments, 'object': obj}, {'member': attr.attr})
    tokens.append(node)
  else:
    raise Exception(f'Unsupported Call function expression: {ast.dump(callExpr.func)}')

def appendConstantToken(const, tokens):
  if type(const.value) == str:
    tokens.append(SplootNode("STRING_LITERAL", {}, {"value": const.value}))
  elif type(const.value) == int or type(const.value) == float:
    tokens.append(SplootNode("NUMERIC_LITERAL", {}, {"value": const.value}))
  elif type(const.value) == bool:
    tokens.append(SplootNode("PYTHON_BOOL", {}, {"value": const.value}))
  elif const.value is None:
    tokens.append(SplootNode("PYTHON_NONE", {}))
  else:
    raise Exception(f'Unsupported constant: {const.value}')

def appendBinaryOperatorExpression(binOp, tokens):
  generateExpression(binOp.left, tokens)
  tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(binOp.op)}))
  generateExpression(binOp.right, tokens)

def appendBooleanOperatorExpression(boolOp, tokens):
  generateExpression(boolOp.values[0], tokens)
  for value in boolOp.values[1:]:
    tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(boolOp.op)}))
    generateExpression(value, tokens)

def appendUnaryOperatorExpression(unOp, tokens):
  tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(unOp.op)}))
  generateExpression(unOp.operand, tokens)

def appendCompareOperatorExpression(comp, tokens):
  generateExpression(comp.left, tokens)
  for op, comparator in zip(comp.ops, comp.comparators):
    tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(op)}))
    generateExpression(comparator, tokens)


def appendListToken(list, tokens):
  elements = [generateExpression(expr) for expr in list.elts]
  if len(elements) == 0:
    elements = [SplootNode('PYTHON_EXPRESSION', {'tokens': []})]
  tokens.append(SplootNode('PYTHON_LIST', {'elements': elements}))

def appendIdentifier(name, tokens):
  tokens.append(SplootNode('PY_IDENTIFIER', {}, {'identifier': name.id}))

def generateExpressionTokens(expr, tokens=None):
  if tokens is None:
    tokens = []

  if type(expr) == ast.Call:
    appendCallToken(expr, tokens)
  elif type(expr) == ast.Constant:
    appendConstantToken(expr, tokens)
  elif type(expr) == ast.Name:
    appendIdentifier(expr, tokens)
  elif type(expr) == ast.BinOp:
    appendBinaryOperatorExpression(expr, tokens)
  elif type(expr) == ast.BoolOp:
    appendBooleanOperatorExpression(expr, tokens)
  elif type(expr) == ast.UnaryOp:
    appendUnaryOperatorExpression(expr, tokens)
  elif type(expr) == ast.Compare:
    appendCompareOperatorExpression(expr, tokens)
  elif type(expr) == ast.List:
    appendListToken(expr, tokens)
  else:
    raise Exception(f'Unrecognised expression type: {ast.dump(expr)}')
  return tokens

def generateExpression(expr, tokens=None):
  tokens = generateExpressionTokens(expr, tokens)
  return SplootNode("PYTHON_EXPRESSION", {"tokens": tokens})

def generateIf(statement):
  test = generateExpression(statement.test)
  body = [generateSplootStatement(s) for s in statement.body]
  elseblocks = []
  elsebody = [generateSplootStatement(s) for s in statement.orelse]
  if len(elsebody) != 0:
    elseblocks = [SplootNode('PYTHON_ELSE_STATEMENT', {'block': elsebody})]

  return SplootNode("PYTHON_IF_STATEMENT", {
    'condition': [test],
    'trueblock': body,
    'elseblocks': elseblocks
  })

def generateWhile(whileStatement):
  test = generateExpression(whileStatement.test)
  body = [generateSplootStatement(s) for s in whileStatement.body]
  return SplootNode("PYTHON_WHILE_LOOP", {
    'condition': [test],
    'block': body
  })

def generateFor(forStatement):
  body = [generateSplootStatement(s) for s in forStatement.body]
  iterable = generateExpression(forStatement.iter)

  if type(forStatement.target) == ast.Name:
    target = SplootNode('PY_IDENTIFIER', {}, {"identifier": forStatement.target.id})
  else:
    raise Exception(f"Unsupported target for assignment: {ast.dump(target)}")

  return SplootNode('PYTHON_FOR_LOOP', {
    'target': [target],
    'iterable': [iterable],
    'block': body
  })

def generateArgs(arguments):
  if len(arguments.posonlyargs) != 0:
    raise Exception('Unsupported: postion-only arguments')
  if arguments.vararg or arguments.kwarg:
    raise Exception('Unsupported: *args and **kwargs function arguments')
  if len(arguments.kwonlyargs) != 0:
    raise Exception('Unsupported: Keyword-only arguments')
  if len(arguments.defaults) != 0:
    raise Exception('Unsupported: Default values for function arguments')
  return [SplootNode('PY_IDENTIFIER', {}, {'identifier': a.arg}) for a in arguments.args]

def generateFunction(func):
  return SplootNode('PYTHON_FUNCTION_DECLARATION', {
    'identifier': [SplootNode('PY_IDENTIFIER', {}, {'identifier': func.name})],
    'params': generateArgs(func.args),
    'body': [generateSplootStatement(s) for s in func.body],
  }, {'id': None})

def generateSplootStatement(statement):
  if type(statement) == ast.Expr:
    expr = generateExpression(statement.value)
    return SplootNode("PYTHON_STATEMENT", {"statement": [expr]})
  elif type(statement) == ast.Assign:
    assign = generateAssignment(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [assign]})
  elif type(statement) == ast.For:
    forNode = generateFor(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [forNode]})
  elif type(statement) == ast.While:
    whileNode = generateWhile(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [whileNode]})
  elif type(statement) == ast.If:
    return SplootNode("PYTHON_STATEMENT", {"statement": [generateIf(statement)]})
  elif type(statement) == ast.FunctionDef:
    func = generateFunction(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [func]})
  elif type(statement) == ast.Break:
    return SplootNode('PY_BREAK')
  elif type(statement) == ast.Continue:
    return SplootNode('PY_CONTINUE')
  else:
    raise Exception(f'Unrecognised statement type: {type(statement)}')
  

def splootFromPython(codeString):
  tree = ast.parse(codeString)
  fileNode = {"type":"PYTHON_FILE","properties":{},"childSets":{"body": []}}
  
  for statement in tree.body:
    statementNode = generateSplootStatement(statement)
    fileNode["childSets"]["body"].append(statementNode)

  return fileNode

def splootNodeFromPython(codeString):
  tree = ast.parse(codeString)
  
  if len(tree.body) > 1:
    fileNode = {"type":"PYTHON_FILE","properties":{},"childSets":{"body": []}}
  
    for statement in tree.body:
      statementNode = generateSplootStatement(statement)
      fileNode["childSets"]["body"].append(statementNode)

    return fileNode

  statement = tree.body[0]
  if type(statement) == ast.Expr:
    expNode = generateExpression(statement.value)
    if len(expNode['childSets']['tokens']) == 1:
      return expNode['childSets']['tokens'][0]
    return expNode

  statementNode = generateSplootStatement(statement)
  return statementNode['childSets']['statement'][0]
