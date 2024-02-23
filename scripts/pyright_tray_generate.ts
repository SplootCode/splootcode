import {
  ImportNode,
  ModuleNameNode,
  ModuleNode,
  NameNode,
  ParseNodeType,
  StatementListNode,
  StructuredEditorProgram,
  TokenType,
  TypeCategory,
  createStructuredProgramWorker,
} from 'structured-pyright'
import { PyodideFakeFileSystem, getAutocompleteInfo, getShortDoc } from '@splootcode/runtime-python'
import { SerializedNode, TrayCategory, TrayEntry } from '@splootcode/core'

import * as fs from 'fs'

// This list is all Python stdlib modules but with the ones that Pyodide doesn't support removed.
const supportedStandardLibModules = [
  'posix', // Not sure why posix needs to go first, but otherwise it gets no results?
  'abc',
  'aifc',
  'argparse',
  'array',
  'ast',
  'asyncio',
  'atexit',
  'base64',
  'bdb',
  'binascii',
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
  'configparser',
  'contextlib',
  'contextvars',
  'copy',
  'copyreg',
  'crypt',
  'csv',
  'ctypes',
  'dataclasses',
  'datetime',
  'decimal',
  'difflib',
  'dis',
  'doctest',
  'email',
  'encodings',
  'enum',
  'errno',
  'faulthandler',
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
  'gzip',
  'hashlib',
  'heapq',
  'hmac',
  'html',
  'http',
  'imaplib',
  'imghdr',
  'importlib',
  'inspect',
  'io',
  'ipaddress',
  'itertools',
  'json',
  'keyword',
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
  'multiprocessing',
  'netrc',
  'nntplib',
  'ntpath',
  'nturl2path',
  'numbers',
  'opcode',
  'operator',
  'optparse',
  'os',
  'pathlib',
  'pdb',
  'pickle',
  'pickletools',
  'pipes',
  'pkgutil',
  'platform',
  'plistlib',
  'poplib',
  'posixpath',
  'pprint',
  'profile',
  'pstats',
  'py_compile',
  'pyclbr',
  'pydoc',
  'pydoc_data',
  'pyexpat',
  'queue',
  'quopri',
  'random',
  're',
  'reprlib',
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
  'smtplib',
  'sndhdr',
  'socket',
  'socketserver',
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
  'tabnanny',
  'tarfile',
  'telnetlib',
  'tempfile',
  'textwrap',
  'this',
  'threading',
  'time',
  'timeit',
  'token',
  'tokenize',
  'trace',
  'traceback',
  'tracemalloc',
  'types',
  'typing',
  'unicodedata',
  'unittest',
  'urllib',
  'uu',
  'uuid',
  'warnings',
  'wave',
  'weakref',
  'webbrowser',
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

import {
  AutocompleteEntryCategory,
  AutocompleteInfo,
  FunctionArgType,
  ModuleInfoFile,
  PythonModuleInfo,
} from '@splootcode/language-python'
import { loadPyodide } from 'pyodide'

// Must have local server running for this to work.
const RequestsURL = 'http://localhost:3001/python/packages/requests-2.28.1-py3-none-any.whl'
const StreamlitURL = 'http://localhost:3001/python/packages/streamlit-1.19.0-py2.py3-none-any.whl'
const TypeshedPath = 'http://localhost:3001/static/typeshed/'

async function main() {
  const pyodide = await loadPyodide({ fullStdLib: true, indexURL: 'node_modules/pyodide' })
  await pyodide.loadPackage('micropip')

  const micropip = pyodide.pyimport('micropip')
  await micropip.install(RequestsURL)
  await micropip.install(StreamlitURL)

  const promises = [
    micropip.install('types-requests==2.28.1'),
    micropip.install('numpy==1.23.5'),
    micropip.install('pandas==1.5.2'),
    micropip.install('pandas-stubs~=1.5.3'),
    micropip.install('flask==2.3.3'),
  ]
  await Promise.all(promises)

  const structuredProgram = createStructuredProgramWorker(new PyodideFakeFileSystem(TypeshedPath, pyodide))

  const moduleInfoFile: ModuleInfoFile = {
    allModules: [],
  }

  fs.rmSync('./packages/language-python/tray', { recursive: true })
  fs.mkdirSync('./packages/language-python/tray')

  for (const module of supportedStandardLibModules) {
    const moduleInfo = await generateTrayListForModule(structuredProgram, module, true)
    moduleInfoFile.allModules.push(moduleInfo)
  }

  for (const module of ['requests', 'streamlit', 'pandas', 'numpy', 'flask']) {
    const moduleInfo = await generateTrayListForModule(structuredProgram, module, false)
    moduleInfoFile.allModules.push(moduleInfo)
  }

  fs.writeFileSync('./packages/language-python/src/standard_lib_modules.json', JSON.stringify(moduleInfoFile, null, 2))
}

async function generateTrayListForModule(
  structuredProgram: StructuredEditorProgram,
  moduleName: string,
  isStandardLib: boolean
): Promise<PythonModuleInfo> {
  let id = 1
  const moduleNameNode: ModuleNameNode = {
    nodeType: ParseNodeType.ModuleName,
    id: id++,
    start: 0,
    length: 0,
    leadingDots: 0,
    nameParts: [
      {
        nodeType: ParseNodeType.Name,
        id: id++,
        start: 0,
        length: 0,
        value: moduleName,
        token: {
          type: TokenType.Identifier,
          start: 0,
          length: 0,
          value: moduleName,
        },
      },
    ],
  }
  moduleNameNode.nameParts[0].parent = moduleNameNode

  const importNode: ImportNode = {
    nodeType: ParseNodeType.Import,
    id: id++,
    start: 0,
    length: 0,
    list: [
      {
        nodeType: ParseNodeType.ImportAs,
        id: id++,
        start: 0,
        length: 0,
        module: moduleNameNode,
      },
    ],
  }
  importNode.list[0].parent = importNode
  moduleNameNode.parent = importNode.list[0]

  const nameNode: NameNode = {
    nodeType: ParseNodeType.Name,
    id: id++,
    start: 0,
    length: 0,
    value: moduleName,
    token: { type: TokenType.Identifier, start: 0, length: 0, value: moduleName },
  }

  const moduleNode: ModuleNode = {
    start: 0,
    length: 0,
    nodeType: ParseNodeType.Module,
    id: id++,
    statements: [
      {
        nodeType: ParseNodeType.StatementList,
        id: id++,
        start: 0,
        length: 0,
        statements: [importNode, nameNode],
      },
    ],
  }

  moduleNode.statements[0].parent = moduleNode
  const statementList = moduleNode.statements[0] as StatementListNode
  importNode.parent = statementList
  nameNode.parent = statementList

  const moduleImports = [
    {
      nameNode: moduleNameNode,
      leadingDots: moduleNameNode.leadingDots,
      nameParts: [moduleName],
      importedSymbols: undefined,
    },
  ]

  structuredProgram.updateStructuredFile('main.py', moduleNode, moduleImports)
  await structuredProgram.parseRecursively('main.py')
  structuredProgram.getBoundSourceFile('main.py')
  if (!structuredProgram.evaluator) {
    throw new Error('Evaluator not initialized')
  }
  const typeResult = structuredProgram.evaluator.getTypeOfExpression(nameNode)
  // The category should be a module
  if (typeResult.type.category !== TypeCategory.Module) {
    throw new Error(`Expected module type but was ${typeResult.type.category} instead`)
  }

  const decls = structuredProgram.evaluator.getDeclarationsForNameNode(nameNode)
  let docs = 'No documentation'
  if (decls && decls.length !== 0) {
    const moduleDoc = structuredProgram.getDocumentationPartsforTypeAndDecl(typeResult.type, decls[0])
    if (moduleDoc && moduleDoc.length !== 0) {
      docs = getShortDoc(moduleDoc[0])
    }
  }
  const moduleInfo: PythonModuleInfo = {
    name: moduleName,
    isStandardLib: isStandardLib,
    description: docs,
  }

  const trayCategory: TrayCategory = {
    category: moduleName,
    entries: [],
  }

  const moduleAutocompleteInfo = getAutocompleteInfo(structuredProgram, typeResult.type, new Set())
  const trayEntries: (TrayEntry | null)[] = moduleAutocompleteInfo.map((autocompleteEntry) => {
    if (autocompleteEntry.name.startsWith('_')) {
      return null
    }
    const canonicalName = moduleName + '.' + autocompleteEntry.name
    const trayEntry: TrayEntry = {
      key: canonicalName,
      abstract: autocompleteEntry.shortDoc,
      serializedNode: generateSerializedNode(moduleName, autocompleteEntry),
    }
    return trayEntry
  })
  trayCategory.entries = trayEntries.filter((entry) => entry) as TrayEntry[]

  // Write to a file
  fs.writeFileSync('./packages/language-python/tray/' + moduleName + '.json', JSON.stringify(trayCategory, null, 2))

  return moduleInfo
}

function generateSerializedNode(moduleName: string, autocompleteEntry: AutocompleteInfo): SerializedNode {
  if (autocompleteEntry.category === AutocompleteEntryCategory.Value) {
    const attrNode = {
      type: 'PYTHON_MEMBER',
      properties: { member: autocompleteEntry.name },
      childSets: {
        object: [
          {
            type: 'PY_IDENTIFIER',
            properties: { identifier: moduleName },
            childSets: {},
          },
        ],
      },
    }
    return attrNode
  } else if (autocompleteEntry.category === AutocompleteEntryCategory.Function) {
    const argNames: string[] = autocompleteEntry.arguments
      .filter((arg) => [FunctionArgType.PositionalOnly, FunctionArgType.PositionalOrKeyword].includes(arg.type))
      .map((arg) => arg.name)

    const args = autocompleteEntry.arguments
      .filter(
        (arg) =>
          !arg.hasDefault && [FunctionArgType.PositionalOnly, FunctionArgType.PositionalOrKeyword].includes(arg.type)
      )
      .map((arg) => {
        return {
          type: 'PY_ARG',
          childSets: {
            argument: [{ type: 'PYTHON_EXPRESSION', properties: {}, childSets: { tokens: [] } }],
          },
          properties: {},
        }
      })

    // Ensure at least one empty argument if this function has any optional arguments.
    if (autocompleteEntry.arguments.length !== 0 && args.length === 0) {
      args.push({
        type: 'PY_ARG',
        childSets: {
          argument: [{ type: 'PYTHON_EXPRESSION', properties: {}, childSets: { tokens: [] } }],
        },
        properties: {},
      })
    }

    const callMemberNode = {
      type: 'PYTHON_CALL_MEMBER',
      properties: { member: autocompleteEntry.name },
      meta: {
        params: argNames,
      },
      childSets: {
        object: [
          {
            type: 'PY_IDENTIFIER',
            properties: { identifier: moduleName },
            childSets: {},
          },
        ],
        arguments: args,
      },
    }
    return callMemberNode
  }
  return null
}

main()
