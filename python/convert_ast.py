from re import S, sub
from executor import OPERATORS, UNARY_OPERATORS
import ast

AST_OPERATORS = {type(value["ast"]): key for key, value in OPERATORS.items()}
UNARY_AST_OPERATORS = {type(value["ast"]): key for key, value in UNARY_OPERATORS.items()}

# These need to match packages/core/language/node_cateogry_registry.ts
class NodeCateogry:
  PythonFile = 25
  PythonStatement = 26
  PythonStatementContents = 27
  PythonElseBlock = 28
  PythonExpression = 29
  PythonExpressionToken = 30
  PythonAssignable = 31
  PythonFunctionName = 32
  PythonLoopVariable = 33
  PythonFunctionArgumentDeclaration = 34
  PythonModuleIdentifier = 35
  PythonModuleAttribute = 36
  PythonDictionaryKeyValue = 37


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

def generateAssignmentTargets(targets):
  if len(targets) != 1:
    raise Exception("Unsupported: multiple targets for assignment")

  target = targets[0]
  if type(target) == ast.Name:
    return [SplootNode('PY_IDENTIFIER', {}, {"identifier": target.id})]
  elif type(target) == ast.Subscript:
    toks = []
    appendSubscriptExpression(target, toks)
    return [toks[0]]
  elif type(target) == ast.Tuple:
    return [generateAssignmentTargets([el])[0] for el in target.elts]
  
  raise Exception(f"Unsupported target for assignment: {targets}")

def generateAssignment(assignStatement):
  return SplootNode("PYTHON_ASSIGNMENT", {
    "left": generateAssignmentTargets(assignStatement.targets),
    "right": [generateExpression(assignStatement.value)],
  })

def generateKeywordArgument(keyword):
  kwarg_node = SplootNode('PY_KWARG', {'value': [generateExpression(keyword.value)]}, {'name': keyword.arg})
  return SplootNode("PY_ARG", {'argument': [kwarg_node]})

def appendCallToken(callExpr, tokens):
  arguments = [SplootNode("PY_ARG", {'argument': [generateExpression(arg)]}) for arg in callExpr.args]
  if len(arguments) == 0:
    arguments = [SplootNode("PY_ARG", {'argument': []})]

  keywords = [generateKeywordArgument(kwarg) for kwarg in callExpr.keywords]
  arguments.extend(keywords)

  if type(callExpr.func) == ast.Name:
    name = callExpr.func.id
    tokens.append(SplootNode('PYTHON_CALL_VARIABLE', {"arguments": arguments}, {"identifier": name}))
  elif type(callExpr.func) == ast.Attribute:
    attr = callExpr.func
    obj = generateExpressionTokens(attr.value)
    node = SplootNode('PYTHON_CALL_MEMBER', {'arguments': arguments, 'object': obj}, {'member': attr.attr})
    tokens.append(node)
  else:
    raise Exception(f'Unsupported Call function expression: {ast.dump(callExpr.func)}')

def appendAttribute(attrExpr, tokens):
  obj = generateExpressionTokens(attrExpr.value)
  node = SplootNode('PYTHON_MEMBER', {'object': obj}, {'member': attrExpr.attr})
  tokens.append(node)

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

def appendTupleToken(tuple, tokens):
  elements = [generateExpression(expr) for expr in tuple.elts]
  if len(elements) == 0:
    elements = [SplootNode('PYTHON_EXPRESSION', {'tokens': []})]
  tokens.append(SplootNode('PY_TUPLE', {'elements': elements}))

def appendSetToken(set, tokens):
  elements = [generateExpression(expr) for expr in set.elts]
  if len(elements) == 0:
    elements = [SplootNode('PYTHON_EXPRESSION', {'tokens': []})]
  tokens.append(SplootNode('PY_SET', {'elements': elements}))

def appendDictToken(dict, tokens):
  keys = [generateExpression(expr) for expr in dict.keys]
  values = [generateExpression(expr) for expr in dict.values]
  els = [SplootNode('PY_KEYVALUE', childSets={'key': [k], 'value': [v]}) for k, v in zip(keys,values)]
  tokens.append(SplootNode('PY_DICT', {'elements': els}))

def appendSubscriptExpression(subscript, tokens):
  target = generateExpressionTokens(subscript.value)
  if type(subscript.slice) == ast.Slice:
    raise Exception('Slice syntax is not supported')
  key = generateExpression(subscript.slice)
  node = SplootNode('PYTHON_SUBSCRIPT', {'target': target, 'key': [key]})
  tokens.append(node)

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
  elif type(expr) == ast.Attribute:
    appendAttribute(expr, tokens)
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
  elif type(expr) == ast.Set:
    appendSetToken(expr, tokens)
  elif type(expr) == ast.Tuple:
    appendTupleToken(expr, tokens)
  elif type(expr) == ast.Dict:
    appendDictToken(expr, tokens)
  elif type(expr) == ast.Subscript:
    appendSubscriptExpression(expr, tokens)
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

  orelse = statement.orelse
  while len(orelse) == 1 and type(orelse[0]) == ast.If:
    # It's one if in an else, make it an elif.
    ifstatement = orelse[0]
    elifbody = [generateSplootStatement(s) for s in ifstatement.body]
    elifcondition = generateExpression(ifstatement.test)
    elseblocks.append(SplootNode('PYTHON_ELIF_STATEMENT', {'block': elifbody, 'condition': [elifcondition]}))
    orelse = ifstatement.orelse

  if len(orelse) != 0:
    elsebody = [generateSplootStatement(s) for s in orelse]
    elseblocks.append(SplootNode('PYTHON_ELSE_STATEMENT', {'block': elsebody}))

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
  targets = generateAssignmentTargets([forStatement.target])

  return SplootNode('PYTHON_FOR_LOOP', {
    'target': targets,
    'iterable': [iterable],
    'block': body
  })

def generateImport(astImport):
  names = [SplootNode('PYTHON_MODULE_IDENTIFIER', {}, {'identifier': n.name}) for n in astImport.names]
  return SplootNode('PYTHON_IMPORT', {'modules': names})


def generateImportFrom(astImport):
  module = SplootNode('PYTHON_MODULE_IDENTIFIER', {}, {'identifier': astImport.module})
  attrs = [SplootNode('PY_IDENTIFIER', {}, {'identifier': n.name}) for n in astImport.names]
  return SplootNode('PYTHON_FROM_IMPORT', {'module': [module], 'attrs': attrs})


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
    return SplootNode("PYTHON_STATEMENT", {"statement": [SplootNode('PY_BREAK')]})
  elif type(statement) == ast.Continue:
    return SplootNode("PYTHON_STATEMENT", {"statement": [SplootNode('PY_CONTINUE')]})
  elif type(statement) == ast.Return:
    return SplootNode("PYTHON_STATEMENT", {"statement": [SplootNode('PYTHON_RETURN')]})
  elif type(statement) == ast.Import:
    return SplootNode("PYTHON_STATEMENT", {"statement": [generateImport(statement)]})
  elif type(statement) == ast.ImportFrom:
    return SplootNode("PYTHON_STATEMENT", {"statement": [generateImportFrom(statement)]})
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

def splootNodesFromPython(codeString):
  tree = ast.parse(codeString)

  if len(tree.body) > 1:
    return ([generateSplootStatement(statement) for statement in tree.body], NodeCateogry.PythonStatement)

  statement = tree.body[0]
  if type(statement) == ast.Expr:
    # Statement is a single expression - just return the list of tokens
    tokens = generateExpressionTokens(statement.value, None)
    return (tokens, NodeCateogry.PythonExpressionToken)

  statementNode = generateSplootStatement(statement)
  return ([statementNode['childSets']['statement'][0]], NodeCateogry.PythonStatementContents)
