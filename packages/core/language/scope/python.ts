import { FunctionDefinition } from "../definitions/loader";

/*
>>> dir(__builtins__)
['ArithmeticError', 'AssertionError', 'AttributeError', 'BaseException', 'BlockingIOError',
'BrokenPipeError', 'BufferError', 'BytesWarning', 'ChildProcessError', 'ConnectionAbortedError',
'ConnectionError', 'ConnectionRefusedError', 'ConnectionResetError', 'DeprecationWarning',
'EOFError', 'Ellipsis', 'EnvironmentError', 'Exception', 'False', 'FileExistsError', 'FileNotFoundError',
'FloatingPointError', 'FutureWarning', 'GeneratorExit', 'IOError', 'ImportError', 'ImportWarning',
'IndentationError', 'IndexError', 'InterruptedError', 'IsADirectoryError', 'KeyError', 'KeyboardInterrupt',
'LookupError', 'MemoryError', 'ModuleNotFoundError', 'NameError', 'None', 'NotADirectoryError',
'NotImplemented', 'NotImplementedError', 'OSError', 'OverflowError', 'PendingDeprecationWarning',
'PermissionError', 'ProcessLookupError', 'RecursionError', 'ReferenceError', 'ResourceWarning',
'RuntimeError', 'RuntimeWarning', 'StopAsyncIteration', 'StopIteration', 'SyntaxError', 'SyntaxWarning',
'SystemError', 'SystemExit', 'TabError', 'TimeoutError', 'True', 'TypeError', 'UnboundLocalError',
'UnicodeDecodeError', 'UnicodeEncodeError', 'UnicodeError', 'UnicodeTranslateError',
'UnicodeWarning', 'UserWarning', 'ValueError', 'Warning', 'ZeroDivisionError',
'_', '__build_class__', '__debug__', '__doc__', '__import__', '__loader__', '__name__',
'__package__', '__spec__', 'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray',
'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'copyright', 'credits', 'delattr',
'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'exit', 'filter', 'float', 'format', 'frozenset',
'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass',
'iter', 'len', 'license', 'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
'oct', 'open', 'ord', 'pow', 'print', 'property', 'quit', 'range', 'repr', 'reversed', 'round',
'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip']
*/

const functions : FunctionDefinition[] = [
  {
    name: 'print',
    deprecated:false,
    type: {parameters:[], returnType: {type: 'void'}},
    documentation:"Outputs information to the terminal",
  },
  {
    name: 'input',
    deprecated: false,
    type: {
      parameters: [
        {name: 'prompt', type: {type: 'literal', literal:'string'}, deprecated: false, documentation: 'The text to prompt the user to type'}
      ],
      returnType: {type: 'literal', literal:'string'}
    },
    documentation:"Asks the user to enter information into the terminal",
  },
  {
    name: 'str',
    deprecated: false,
    type: {
      parameters: [
        {name: '', type: {type: 'any'}, deprecated: false, documentation: 'The value to convert to a string'}
      ],
      returnType: {type: 'literal', literal:'string'},
    },
    documentation: 'Convert to a string (text)',
  },
  {
    name: 'int',
    deprecated: false,
    type: {
      parameters: [
        {name: '', type: {type: 'any'}, deprecated: false, documentation: 'The value to convert to an integer'}
      ],
      returnType: {type: 'literal', literal:'number'},
    },
    documentation: 'Convert to an integer number (whole number)',
  },
  {
    name: 'enumerate',
    deprecated: false,
    type: {
      parameters: [
        {name: 'iterable', type: {type: 'any'}, deprecated: false, documentation: 'A list or other iterable object'}
      ],
      returnType: {type: 'literal', literal:'number'},
    },
    documentation: 'Loops over an iterable and returns pairs of the count and the items from the iterable.',
  },
  {
    name: 'len',
    deprecated: false,
    type: {
      parameters: [
        {name: 'iterable', type: {type: 'any'}, deprecated: false, documentation: 'A list or other iterable object'}
      ],
      returnType: {type: 'literal', literal:'number'},
    },
    documentation: 'Returns the length of something, how many items are in a list or characters in a string',
  },
  {
    name: 'range',
    deprecated: false,
    type: {
      parameters: [
        {name: 'start', type: {type: 'any'}, deprecated: false, documentation: 'The number to start counting from.'},
        {name: 'end', type: {type: 'any'}, deprecated: false, documentation: 'Stop counting before this number, not including this number.'}
      ],
      returnType: {type: 'any'},
    },
    documentation: 'Counts from a starting number up to, but not including, the end number.',
  },
];

export function loadPythonBuiltinFunctions() : FunctionDefinition[] {
  return functions;
}