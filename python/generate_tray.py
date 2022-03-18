import json

import yaml

from convert_ast import splootNodeFromPython
from generate_builtins import generate_builtins_docs
from convert_ast import SplootNode

def processExample(ex):
  return {
    'serializedNode': splootNodeFromPython(ex['ex']),
    'description': ex['desc']
  }

def processEntry(data, builtin_docs):
  if 'category' in data:
    return processCategory(data, builtin_docs)

  entry = {
    'key': data['key'],
  }

  if 'scopeEntry' in data:
    scopeName = data['scopeEntry']
    if scopeName in builtin_docs['values']:
      scopeInfo = builtin_docs['values'][scopeName]
      entry['abstract'] = scopeInfo['shortDoc']
      if scopeInfo['isCallable']:
        serNode = SplootNode('PYTHON_CALL_VARIABLE', {"arguments": [
          SplootNode('PYTHON_EXPRESSION', {'tokens': []})
        ]}, {"identifier": scopeName})
        entry['serializedNode'] = serNode
      else:
        serNode = SplootNode('PY_IDENTIFIER', {}, {"identifier": scopeName})
        entry['serializedNode'] = serNode
    else:
      raise Exception(f'ScopeEntry {scopeName} not found')
  
  if 'scopeTypeAttr' in data:
      scopeType = data['scopeTypeAttr']['type']
      attrName = data['scopeTypeAttr']['attr']
      scopeInfo = builtin_docs['types'][scopeType]['attributes'][attrName]
      if scopeInfo['isCallable']:
        serNode = SplootNode('PYTHON_CALL_MEMBER', {"object": [], "arguments": [
          SplootNode('PYTHON_EXPRESSION', {'tokens': []})
        ]}, {"member": attrName})
        entry['serializedNode'] = serNode
      entry['abstract'] = scopeInfo['shortDoc']

  if 'abstract' in data:
    entry['abstract'] = data['abstract']
  if 'title' in data:
    entry['title'] = data['title']
  if 'node' in data:
    entry['serializedNode'] = splootNodeFromPython(data['node'])
  elif 'serializedNode' in data:
    entry['serializedNode'] = data['serializedNode']
  if 'examples' in data:
    entry['examples'] = [processExample(ex) for ex in data['examples']]

  return entry

def processCategory(data, builtin_docs):
  return {
    'category': data['category'],
    'entries': [processEntry(listing, builtin_docs) for listing in data.get('entries', [])]
  }

def generate_file(data, filename):
  builtin_docs = generate_builtins_docs()

  result = {}
  result = processCategory(data, builtin_docs)

  with open(filename, 'w') as f:
    json.dump(result, f)


if __name__ == '__main__':
  import argparse
  parser = argparse.ArgumentParser(description='Generate documentation for Python language and libraries.')
  parser.add_argument('-o', '--outfile', type=str, required=True, help='file path to write the output to, should be .json')  
  args = parser.parse_args()

  with open("./library/language.yaml", "r") as f:
    data = yaml.safe_load(f)
    generate_file(data, args.outfile)

