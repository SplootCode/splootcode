import unittest

from module_loader import generate_module_info


class ModuleLoaderTests(unittest.TestCase):

    def testDatetime(self):
        self.maxDiff = None
        data = generate_module_info('datetime')
        self.assertCountEqual(data.keys(), ['moduleName', 'values', 'types'])
        self.assertEqual(data['moduleName'], 'datetime')

        self.assertEqual(data['values']['datetime'], {
            'name': 'datetime',
            'doc': 'datetime(year, month, day[, hour[, minute[, second[, microsecond[,tzinfo]]]]])\n\nThe year, month and day arguments are required. tzinfo may be None, or an\ninstance of a tzinfo subclass. The remaining arguments may be ints.\n',
            'isCallable': True,
            'isClass': True,
            'isModule': False,
            'parameters': [
                {'kind': 'VAR_POSITIONAL', 'name': 'args'},
                {'kind': 'VAR_KEYWORD', 'name': 'kwargs'}
            ],
            'shortDoc': 'datetime(year, month, day[, hour[, minute[, second[, microsecond[,tzinfo]]]]])',
            'typeModule': 'builtins',
            'typeName': 'type'
        })

        self.assertEqual(data['types']['datetime']['name'], 'datetime')
        dt_attrs = data['types']['datetime']['attributes']

        # Check one callable method
        self.assertEqual(dt_attrs['date'], {
            'doc': 'Return date object with same year, month and day.',
            'examples': [],
            'isCallable': True,
            'isClass': False,
            'isModule': False,
            'name': 'date',
            'shortDoc': 'Return date object with same year, month and day.',
            'typeModule': 'builtins',
            'typeName': 'method_descriptor'
        })

        # Check one non-callable attribute
        self.assertEqual(dt_attrs['tzinfo'], {
            'doc': None,
            'examples': [],
            'isCallable': False,
            'isClass': False,
            'isModule': False,
            'name': 'tzinfo',
            'shortDoc': '',
            'typeModule': 'builtins',
            'typeName': 'getset_descriptor'
        })


    def testRandom(self):
        self.maxDiff = None
        data = generate_module_info('random')
        self.assertCountEqual(data.keys(), ['moduleName', 'values', 'types'])
        self.assertEqual(data['moduleName'], 'random')

        self.assertEqual(data['values']['randint'], {
            'name': 'randint',
            'doc': 'Return random integer in range [a, b], including both end points.\n        ',
            'isCallable': True,
            'isClass': False,
            'isModule': False,
            'parameters': [
                {'kind': 'POSITIONAL_OR_KEYWORD', 'name': 'a'},
                {'kind': 'POSITIONAL_OR_KEYWORD', 'name': 'b'},
            ],
            'shortDoc': 'Return random integer in range [a, b], including both end points.',
            'typeModule': 'builtins',
            'typeName': 'method'
        })
