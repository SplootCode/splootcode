import json
import yaml
import builtins

from module_loader import get_type_data, get_value_data

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
        if name == 'None':
            continue

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