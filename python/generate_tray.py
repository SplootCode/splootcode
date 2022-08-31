import json

import yaml

from convert_ast import SplootNode, splootNodesFromPython, splootNodeFromPython
from generate_builtins import generate_builtins_docs

def processExample(ex):
  nodes, category = splootNodesFromPython(ex['ex'])
  return {
    'serializedNodes': {'category': category, 'nodes': nodes},
    'description': ex['desc']
  }


def get_entry_for_builtin_value(key, scopeName, builtin_docs):
  entry = {
    'key': key
  }
  if scopeName in builtin_docs['values']:
    scopeInfo = builtin_docs['values'][scopeName]
    entry['abstract'] = scopeInfo['shortDoc']
    entry['examples'] = []
    if 'examples' in scopeInfo:
      entry['examples'] = scopeInfo['examples']

    if scopeInfo['isCallable']:
      if 'parameters' not in scopeInfo:
        print(scopeInfo)
        params = []
      else:
        params = scopeInfo['parameters']
      labels = [param['name'] for param in params]
      required_count = len([param for param in params if is_required_param(param)])

      serNode = SplootNode('PYTHON_CALL_VARIABLE',
        {
          "arguments": [SplootNode('PYTHON_EXPRESSION', {'tokens': []}) for i in range(required_count)]
        },
        {"identifier": scopeName})
      serNode['meta'] = {'params': labels}
      entry['serializedNode'] = serNode
    else:
      serNode = SplootNode('PY_IDENTIFIER', {}, {"identifier": scopeName})
      entry['serializedNode'] = serNode
  else:
    raise Exception(f'ScopeEntry {scopeName} not found')
  return entry

def is_required_param(param):
  return (param['kind'] == 'POSITIONAL_ONLY' or param['kind'] == 'POSITIONAL_OR_KEYWORD') and 'default' not in param

def get_entry_for_builtin_attr(key, typeName, attrName, builtin_docs):
  entry = {
    'key': key
  }

  scopeInfo = builtin_docs['types'][typeName]['attributes'][attrName]
  if scopeInfo['isCallable']:
    if 'parameters' not in scopeInfo:
      print(scopeInfo)
    labels = [param['name'] for param in scopeInfo['parameters']]
    required_count = len([param for param in scopeInfo['parameters'] if is_required_param(param)])

    serNode = SplootNode('PYTHON_CALL_MEMBER', {
      "object": [],
      "arguments": [SplootNode('PYTHON_EXPRESSION', {'tokens': []}) for i in range(required_count)]
    }, {"member": attrName})
    serNode['meta'] = {'params': labels, 'objectType': typeName}
    entry['serializedNode'] = serNode
  else:
    raise Exception(f'Non-callable type attributes not yet supported: {key}')
  entry['abstract'] = scopeInfo['shortDoc']
  entry['examples'] = scopeInfo['examples']
  return entry


def processEntry(data, builtin_docs, sploot_nodes):
  if type(data) == dict and 'category' in data:
    return processCategory(data, builtin_docs, sploot_nodes)

  if type(data) != str:
    raise Exception(f'{data} is not a string. If not a category, then all entries should be strings.')

  key = data

  components = key.split('.')
  if components[0] == 'sploot-node':
    if components[1] in sploot_nodes:
      return sploot_nodes[components[1]]
  elif components[0] == 'builtins':
    if len(components) == 2:
      # A builtin value or function
      return get_entry_for_builtin_value(key, components[1], builtin_docs)
    elif len(components) == 3:
      return get_entry_for_builtin_attr(key, components[1], components[2], builtin_docs)

  raise Exception(f'Unsupported entry key: {key}')


def generate_sploot_node_docs():
  with open("./library/sploot-node-docs.yaml", "r") as f:
    data = yaml.safe_load(f)

  nodes = {}

  for node in data['nodes']:
    entry = {
      'key': node['key']
    }
    if 'abstract' in node:
      entry['abstract'] = node['abstract']
    if 'title' in node:
      entry['title'] = node['title']
    if 'node' in node:
      entry['serializedNode'] = splootNodeFromPython(node['node'])
    elif 'serializedNode' in node:
      entry['serializedNode'] = node['serializedNode']
    if 'examples' in node:
      entry['examples'] = [processExample(ex) for ex in node['examples']]

    nodes[node['key']] = entry

  return nodes

def processCategory(data, builtin_docs, sploot_nodes):
  return {
    'category': data['category'],
    'entries': [processEntry(listing, builtin_docs, sploot_nodes) for listing in data.get('entries', [])]
  }

def generate_file(data, filename):
  builtin_docs = generate_builtins_docs()
  sploot_nodes = generate_sploot_node_docs()

  result = {}
  result = processCategory(data, builtin_docs, sploot_nodes)

  with open(filename, 'w') as f:
    json.dump(result, f)


if __name__ == '__main__':
  import argparse
  parser = argparse.ArgumentParser(description='Generate documentation for Python language and libraries.')
  parser.add_argument('-o', '--outfile', type=str, required=True, help='file path to write the output to, should be .json')  
  args = parser.parse_args()

  with open("./library/tray_categories.yaml", "r") as f:
    data = yaml.safe_load(f)
    generate_file(data, args.outfile)

