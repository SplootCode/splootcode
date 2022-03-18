import json
import yaml

from inspect import signature, isclass, ismodule, Signature, getmembers

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

def get_method_params(thing):
    params = []
    sig = signature(thing)
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
        'shortDoc': short_doc(thing.__doc__),
    }

    if callable(thing):
        params = None
        try:
            if isclass(thing):
                params = get_method_params(thing.__init__)
            else:
                params = get_func_params(thing)
        except ValueError:
            print('No Signature for ', str(thing))

        if params is not None:
            results['parameters'] = params

    return results

def get_type_data(typething):
    data = {
        'name': typething.__name__,
        'module': typething.__module__,
        'doc': typething.__doc__,
        'shortDoc': short_doc(typething.__doc__),
    }
    attributes = {}
    for name, thing in getmembers(typething):
        print(name, thing)
        attr_data = {
            'name': name,
            'typeName': type(thing).__name__,
            'typeModule': type(thing).__module__,
            'isClass': isclass(thing),
            'isCallable': callable(thing),
            'isModule': ismodule(thing),
            'doc': thing.__doc__,
            'shortDoc': short_doc(thing.__doc__),
        }
        params = None
        if callable(thing) and not isclass(thing):
            try:
                params = get_method_params(thing)
            except ValueError:
                print('No Signature for ', str(thing))
        if params is not None:
            attr_data['parameters'] = params
        attributes[name] = attr_data

    data['attributes'] = attributes
    return data


def generate_builtins_docs(overrides):
    builtins = {
        'moduleName': 'builtins',
        'values': {},
        'types': {}
    }
    
    for name in dir(__builtins__):
        thing = getattr(__builtins__, name)
        data = get_value_data(name, thing)

        thingKey = f'builtins.{name}'
        if thingKey in overrides:
            overrideData = overrides[thingKey]
            if 'shortDoc' in overrideData:
                data['shortDoc'] = overrideData['shortDoc']

        builtins['values'][name] = data

        if (data['typeName'] == 'type'):
            print(data)
            type_data = get_type_data(thing)
            builtins['types'][name] = type_data

        json.dumps(data)

    return builtins

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate documentation for Python language and libraries.')
    parser.add_argument('-o', '--outfile', type=str, required=True, help='file path to write the output to, should be .json')  
    args = parser.parse_args()

    filename = args.outfile

    overrides = {}
    with open("./library/overrides.yaml", "r") as f:
        overrides_list = yaml.safe_load(f)['overrides']
        for override in overrides_list:
            overrides[override['name']] = override

    builtin_stuff = generate_builtins_docs(overrides)

    with open(filename, 'w') as f:
        json.dump(builtin_stuff, f)

    print(builtin_stuff['values'].keys())
    print(len(builtin_stuff['values']))

    print(builtin_stuff['types'].keys())
    print(len(builtin_stuff['types']))

    print(builtin_stuff['types']['str'])