import importlib

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
            # print('No Signature for ', str(thing))
            pass

        if params is not None:
            results['parameters'] = params

    return results

def get_type_data(typething, overrides):
    if len(overrides) != 0:
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
        params = None
        if callable(thing) and not isclass(thing):
            try:
                params = get_method_params(thing)
            except ValueError:
                pass
                # print('No Signature for ', str(thing))
        if params is not None:
            attr_data['parameters'] = params

        thingKey = f'builtins.{typething.__name__}.{name}'
        if thingKey in overrides:
            overrideData = overrides[thingKey]
            if 'examples' in overrideData:
                attr_data['examples'] = [processExample(ex) for ex in overrideData['examples']]
            if 'parameters' in overrideData:
                attr_data['parameters'] = overrideData['parameters']
        attributes[name] = attr_data

    data['attributes'] = attributes
    return data


def generate_module_info(moduleName):

    module_info = {
        'moduleName': moduleName,
        'values': {},
        'types': {}
    }

    try:
        module = importlib.import_module(moduleName)
    except ModuleNotFoundError as e:
        return None

    for name in dir(module):
        thing = getattr(module, name)
        data = get_value_data(name, thing)

        module_info['values'][name] = data

        if (data['typeName'] == 'type'):
            type_data = get_type_data(thing, {})
            module_info['types'][name] = type_data

    return module_info