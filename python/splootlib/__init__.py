
def generateExecutableCode(tree, filename: str):
  import ast
  from .generate_ast import getStatementsFromBlock
  statements = getStatementsFromBlock(tree["childSets"]["body"])
  mods = ast.Module(body=statements, type_ignores=[])
  code = compile(ast.fix_missing_locations(mods), filename, mode="exec")
  return code


def generateTextCode(tree):
  import ast
  from .generate_ast import getStatementsFromBlock
  statements = getStatementsFromBlock(tree["childSets"]["body"])
  mods = ast.Module(body=statements, type_ignores=[])
  return ast.unparse(ast.fix_missing_locations(mods))

