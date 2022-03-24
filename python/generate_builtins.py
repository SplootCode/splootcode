import json
import yaml
import builtins

from inspect import signature, isclass, ismodule, Signature, getmembers


def short_doc(doc):
    if not doc:
        return ''
    short = doc
    if '.' in doc and 10 < doc.index('.') < 100:
        short = doc.split('.')[0] + '.'
    elif '\n' in doc and doc.index('\n') < 100:
        short = doc.split('\n')[0]
    elif len(doc) > 140:
        short = doc[:97] + '...'

    lines = doc.split('\n')
    if '->' in short and len(lines) > 2:
        remainder = '\n'.join(lines[1:])
        return short_doc(remainder.strip())

    return short

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

def get_type_data(typething, overrides):
    from generate_tray import processExample

    data = {
        'name': typething.__name__,
        'module': typething.__module__,
        'doc': typething.__doc__,
        'shortDoc': short_doc(typething.__doc__),
    }
    attributes = {}
    for name, thing in getmembers(typething):
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
        attr_data['examples'] = []
        thingKey = f'builtins.{typething.__name__}.{name}'
        if thingKey in overrides:
            overrideData = overrides[thingKey]
            if 'examples' in overrideData:
                attr_data['examples'] = [processExample(ex) for ex in overrideData['examples']]
        params = None
        if callable(thing) and not isclass(thing):
            try:
                params = get_method_params(thing)
            except ValueError:
                pass
                # print('No Signature for ', str(thing))
        if params is not None:
            attr_data['parameters'] = params
        attributes[name] = attr_data

    data['attributes'] = attributes
    return data


def generate_builtins_docs():
    from generate_tray import processExample

    overrides = {}
    with open("./library/overrides.yaml", "r") as f:
        overrides_list = yaml.safe_load(f)['overrides']
        for override in overrides_list:
            overrides[override['key']] = override

    builtins_data = {
        'moduleName': 'builtins',
        'values': {},
        'types': {}
    }

    for name in dir(builtins):
        thing = getattr(builtins, name)
        data = get_value_data(name, thing)

        thingKey = f'builtins.{name}'
        if thingKey in overrides:
            overrideData = overrides[thingKey]
            if 'abstract' in overrideData:
                data['shortDoc'] = overrideData['abstract']
            data['examples'] = []
            if 'examples' in overrideData:
                data['examples'] = [processExample(ex) for ex in overrideData['examples']]

        builtins_data['values'][name] = data

        if (data['typeName'] == 'type'):
            type_data = get_type_data(thing, overrides)
            builtins_data['types'][name] = type_data

    return builtins_data

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate documentation for Python language and libraries.')
    parser.add_argument('-o', '--outfile', type=str, required=True, help='file path to write the output to, should be .json')  
    args = parser.parse_args()

    filename = args.outfile

    builtin_stuff = generate_builtins_docs()

    with open(filename, 'w') as f:
        json.dump(builtin_stuff, f)