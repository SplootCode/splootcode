import { HighlightColorCategory } from '../../../colors'
import {
  LayoutComponent,
  LayoutComponentType,
  NodeLayout,
  SerializedNode,
  TypeRegistration,
  registerType,
} from '../../type_registry'
import {
  NodeCategory,
  SuggestionGenerator,
  registerAutocompleter,
  registerNodeCateogry,
} from '../../node_category_registry'
import { ParentReference } from '../../node'
import { PythonNode } from './python_node'
import { SuggestedNode } from '../../autocomplete/suggested_node'

export const PYTHON_MODULE_IDENTIFIER = 'PYTHON_MODULE_IDENTIFIER'

function sanitizeIdentifier(textInput: string): string {
  textInput = textInput.replace(/[^\w\s\d.]/g, ' ')
  // Don't mess with it if there are no spaces or punctuation.
  if (textInput.indexOf(' ') === -1) {
    return textInput
  }

  return textInput
    .split(' ')
    .map(function (word, index) {
      if (index == 0) {
        // Don't prefix the first word.
        return word
      }
      return '_' + word.toLowerCase()
    })
    .join('')
}

const allowedModules = [
  'abc',
  'aifc',
  'antigravity',
  'argparse',
  'array',
  'ast',
  'asynchat',
  'asyncio',
  'asyncore',
  'atexit',
  'audioop',
  'base64',
  'bdb',
  'binascii',
  'binhex',
  'bisect',
  'builtins',
  'bz2',
  'cProfile',
  'calendar',
  'cgi',
  'cgitb',
  'chunk',
  'cmath',
  'cmd',
  'code',
  'codecs',
  'codeop',
  'collections',
  'colorsys',
  'compileall',
  'concurrent',
  'configparser',
  'contextlib',
  'contextvars',
  'copy',
  'copyreg',
  'crypt',
  'csv',
  'ctypes',
  'curses',
  'dataclasses',
  'datetime',
  'dbm',
  'decimal',
  'difflib',
  'dis',
  'distutils',
  'doctest',
  'email',
  'encodings',
  'ensurepip',
  'enum',
  'errno',
  'faulthandler',
  'fcntl',
  'filecmp',
  'fileinput',
  'fnmatch',
  'fractions',
  'ftplib',
  'functools',
  'gc',
  'genericpath',
  'getopt',
  'getpass',
  'gettext',
  'glob',
  'graphlib',
  'grp',
  'gzip',
  'hashlib',
  'heapq',
  'hmac',
  'html',
  'http',
  'idlelib',
  'imaplib',
  'imghdr',
  'imp',
  'importlib',
  'inspect',
  'io',
  'ipaddress',
  'itertools',
  'json',
  'keyword',
  'lib2to3',
  'linecache',
  'locale',
  'logging',
  'lzma',
  'mailbox',
  'mailcap',
  'marshal',
  'math',
  'mimetypes',
  'mmap',
  'modulefinder',
  'msilib',
  'msvcrt',
  'multiprocessing',
  'netrc',
  'nis',
  'nntplib',
  'nt',
  'ntpath',
  'nturl2path',
  'numbers',
  'opcode',
  'operator',
  'optparse',
  'os',
  'ossaudiodev',
  'pathlib',
  'pdb',
  'pickle',
  'pickletools',
  'pipes',
  'pkgutil',
  'platform',
  'plistlib',
  'poplib',
  'posix',
  'posixpath',
  'pprint',
  'profile',
  'pstats',
  'pty',
  'pwd',
  'py_compile',
  'pyclbr',
  'pydoc',
  'pydoc_data',
  'pyexpat',
  'queue',
  'quopri',
  'random',
  're',
  'readline',
  'reprlib',
  'resource',
  'rlcompleter',
  'runpy',
  'sched',
  'secrets',
  'select',
  'selectors',
  'shelve',
  'shlex',
  'shutil',
  'signal',
  'site',
  'smtpd',
  'smtplib',
  'sndhdr',
  'socket',
  'socketserver',
  'spwd',
  'sqlite3',
  'sre_compile',
  'sre_constants',
  'sre_parse',
  'ssl',
  'stat',
  'statistics',
  'string',
  'stringprep',
  'struct',
  'subprocess',
  'sunau',
  'symtable',
  'sys',
  'sysconfig',
  'syslog',
  'tabnanny',
  'tarfile',
  'telnetlib',
  'tempfile',
  'termios',
  'textwrap',
  'this',
  'threading',
  'time',
  'timeit',
  'tkinter',
  'token',
  'tokenize',
  'trace',
  'traceback',
  'tracemalloc',
  'tty',
  'turtle',
  'turtledemo',
  'types',
  'typing',
  'unicodedata',
  'unittest',
  'urllib',
  'uu',
  'uuid',
  'venv',
  'warnings',
  'wave',
  'weakref',
  'webbrowser',
  'winreg',
  'winsound',
  'wsgiref',
  'xdrlib',
  'xml',
  'xmlrpc',
  'zipapp',
  'zipfile',
  'zipimport',
  'zlib',
  'zoneinfo',
]
export class ModuleSuggestionGenerator implements SuggestionGenerator {
  constantSuggestions() {
    return allowedModules.map((moduleName) => {
      const newVar = new PythonModuleIdentifier(null, moduleName)
      return new SuggestedNode(newVar, `module ${moduleName}`, 'module', true, 'module')
    })
  }

  dynamicSuggestions(parent: ParentReference, index: number, textInput: string) {
    const varName = sanitizeIdentifier(textInput)
    if (allowedModules.includes(varName)) {
      return []
    }
    const newVar = new PythonModuleIdentifier(null, varName)
    const suggestedNode = new SuggestedNode(newVar, `module ${varName}`, 'module', true, 'module')
    return [suggestedNode]
  }
}

export class PythonModuleIdentifier extends PythonNode {
  constructor(parentReference: ParentReference, name: string) {
    super(parentReference, PYTHON_MODULE_IDENTIFIER)
    this.setProperty('identifier', name)
  }

  setName(name: string) {
    this.setProperty('identifier', name)
  }

  getName() {
    return this.getProperty('identifier')
  }

  addSelfToScope(): void {
    this.parent?.node.addSelfToScope()
  }

  removeSelfFromScope(): void {
    this.parent?.node.addSelfToScope()
  }

  static deserializer(serializedNode: SerializedNode): PythonModuleIdentifier {
    const node = new PythonModuleIdentifier(null, serializedNode.properties.identifier)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_MODULE_IDENTIFIER
    typeRegistration.deserializer = PythonModuleIdentifier.deserializer
    typeRegistration.properties = ['identifier']
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.VARIABLE, [
      new LayoutComponent(LayoutComponentType.PROPERTY, 'identifier'),
    ])

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_MODULE_IDENTIFIER, NodeCategory.PythonModuleIdentifier)
    registerAutocompleter(NodeCategory.PythonModuleIdentifier, new ModuleSuggestionGenerator())
  }
}
