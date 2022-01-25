from re import S
from executor import OPERATORS
import ast

AST_OPERATORS = {type(value["ast"]): key for key, value in OPERATORS.items()}


def convertOperator(astOp):
  return AST_OPERATORS[type(astOp)]

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
    return SplootNode('PYTHON_DECLARED_IDENTIFIER', {}, {"identifier": target.id})
  
  raise Exception(f"Unsupported target for assignment: {ast.dump(target)}")

def generateAssignment(assignStatement):
  return SplootNode("PYTHON_ASSIGNMENT", {
    "left": [generateAssignmentTarget(assignStatement.targets)],
    "right": [generateExpression(assignStatement.value)],
  })

def appendCallToken(callExpr, tokens):
  arguments = [generateExpression(arg) for arg in callExpr.args]

  if type(callExpr.func) == ast.Name:
    name = callExpr.func.id
    tokens.append(SplootNode('PYTHON_CALL_VARIABLE', {"arguments":arguments}, {"identifier": name}))
  elif type(callExpr.func) == ast.Attribute:
    raise Exception('Call expression on attribute (member) not yet supported.')
  else:
    raise Exception(f'Unsupported Call function expression: {ast.dump(callExpr.func)}')
  

def appendConstantToken(const, tokens):
  if type(const.value) == str:
    tokens.append(SplootNode("STRING_LITERAL", {}, {"value": const.value}))
  elif type(const.value) == int:
    tokens.append(SplootNode("NUMERIC_LITERAL", {}, {"value": const.value}))
  else:
    raise Exception(f'Unsupported constant: {const.value}')


def appendBinaryOperatorExpression(binOp, tokens):
  generateExpression(binOp.left, tokens)
  tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(binOp.op)}))
  generateExpression(binOp.right, tokens)


def appendCompareOperatorExpression(comp, tokens):
  generateExpression(comp.left, tokens)
  for op, comparator in zip(comp.ops, comp.comparators):
    tokens.append(SplootNode('PYTHON_BINARY_OPERATOR', {}, {'operator': convertOperator(op)}))
    generateExpression(comparator, tokens)


def appendVariableReference(name, tokens):
  tokens.append(SplootNode('PYTHON_VARIABLE_REFERENCE', {}, {'identifier': name.id}))

def generateExpression(expr, tokens=None):
  if tokens is None:
    tokens = []

  if type(expr) == ast.Call:
    appendCallToken(expr, tokens)
  elif type(expr) == ast.Constant:
    appendConstantToken(expr, tokens)
  elif type(expr) == ast.Name:
    appendVariableReference(expr, tokens)
  elif type(expr) == ast.BinOp:
    appendBinaryOperatorExpression(expr, tokens)
  elif type(expr) == ast.Compare:
    appendCompareOperatorExpression(expr, tokens)
  else:
    raise Exception(f'Unrecognised expression type: {ast.dump(expr)}')
  
  return SplootNode("PYTHON_EXPRESSION", {"tokens": tokens})

def generateWhile(whileStatement):
  test = generateExpression(whileStatement.test)
  body = [generateSplootStatement(s) for s in whileStatement.body]
  return SplootNode("PYTHON_WHILE_LOOP", {
    'condition': [test],
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
  return [SplootNode('PYTHON_DECLARED_IDENTIFIER', {}, {'identifier': a.arg}) for a in arguments.args]

def generateFunction(func):
  return SplootNode('PYTHON_FUNCTION_DECLARATION', {
    'identifier': [SplootNode('PYTHON_DECLARED_IDENTIFIER', {}, {'identifier': func.name})],
    'params': generateArgs(func.args),
    'body': [generateSplootStatement(s) for s in func.body]
  })

def generateSplootStatement(statement):
  if type(statement) == ast.Expr:
    expr = generateExpression(statement.value)
    return SplootNode("PYTHON_STATEMENT", {"statement": [expr]})
  elif type(statement) == ast.Assign:
    assign = generateAssignment(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [assign]})
  elif type(statement) == ast.While:
    whileNode = generateWhile(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [whileNode]})
  elif type(statement) == ast.FunctionDef:
    func = generateFunction(statement)
    return SplootNode("PYTHON_STATEMENT", {"statement": [func]})
  else:
    raise Exception(f'Unrecognised statement type: {type(statement)}')
  

def splootFromPython(codeString):
  tree = ast.parse(codeString)
  fileNode = {"type":"PYTHON_FILE","properties":{},"childSets":{"body": []}}
  
  for statement in tree.body:
    statementNode = generateSplootStatement(statement)
    fileNode["childSets"]["body"].append(statementNode)

  return fileNode
