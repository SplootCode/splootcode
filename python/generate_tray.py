import json

import yaml

from convert_ast import splootNodeFromPython 

def processExample(ex):
  return {
    'serializedNode': splootNodeFromPython(ex['ex']),
    'description': ex['desc']
  }

def processEntry(data):
  if 'category' in data:
    return processCategory(data)
  
  entry = {
    'key': data['key'],
    'abstract': data['abstract'],
  }
  if 'title' in data:
    entry['title'] = data['title']
  if 'node' in data:
    entry['serializedNode'] = splootNodeFromPython(data['node'])
  elif 'serializedNode' in data:
    entry['serializedNode'] = data['serializedNode']
  if 'examples' in data:
    entry['examples'] = [processExample(ex) for ex in data['examples']]

  return entry

def processCategory(data):
  return {
    'category': data['category'],
    'entries': [processEntry(listing) for listing in data.get('entries', [])]
  }

def generate_file(data, filename):
  result = {}
  result = processCategory(data)

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

