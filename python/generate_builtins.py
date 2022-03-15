import json

from inspect import signature, isclass, ismodule, Signature

def short_doc(doc):
    if not doc:
        return ''
    if '.' in doc and doc.index('.') < 100:
        return doc.split('.')[0] + '.'
    if '\n' in doc and doc.index('\n') < 100:
        return doc.split('\n')[0]
    if len(doc) > 100:
        return doc[:97] + '...'
    return doc

def get_init_params(thing):
    params = []
    sig = signature(thing.__init__)
    for name in list(sig.parameters)[1:]:
        param = sig.parameters[name]
        res = {
            'name': name,
            'kind': param.kind.name,
        }
        if param.default != param.empty:
            res['default'] = str(param.default)
        params.append(res)
    return params

def get_func_params(thing):
    params = []
    sig = signature(thing)
    for name in sig.parameters:
        param = sig.parameters[name]
        res = {
            'name': name,
            'kind': param.kind.name,
        }
        if param.default != param.empty:
            res['default'] = str(param.default)
        params.append(res)
    return params


def get_value_data(name, thing):
    results = {
        'name': name,
        'typeName': type(thing).__name__,
        'typeModule': type(thing).__module__,
        'isClass': isclass(thing),
        'isCallable': callable(thing),
        'isModule': ismodule(thing),
        'doc': thing.__doc__,
        'shortDoc': short_doc(thing.__doc__)
    }

    if callable(thing):
        params = None
        try:
            if isclass(thing):
                params = get_init_params(thing)
            else:
                params = get_func_params(thing)
        except ValueError:
            print('No Signature for ', str(thing))

        if params is not None:
            results['parameters'] = params

    return results

def generate_builtins_docs():
    builtins = {
        'moduleName': 'builtins',
        'values': {},
        'types': {}
    }
    
    for name in dir(__builtins__):
        thing = getattr(__builtins__, name)
        data = get_value_data(name, thing)
        builtins['values'][name] = data
        if (data['typeName'] == 'type'):
            print(data)
        json.dumps(data)

    return builtins

if __name__ == '__main__':
  import argparse
  parser = argparse.ArgumentParser(description='Generate documentation for Python language and libraries.')
  parser.add_argument('-o', '--outfile', type=str, required=True, help='file path to write the output to, should be .json')  
  args = parser.parse_args()

  filename = args.outfile

  builtins = generate_builtins_docs()

  with open(filename, 'w') as f:
    json.dump(builtins, f)
