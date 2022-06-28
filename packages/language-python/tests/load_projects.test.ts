import { PYTHON_FILE, PythonFile } from '../nodes/python_file'
import { ParseMapper } from '../analyzer/python_analyzer'
import { TestWalker } from '../nodes/tests/tree_walker'
import { loadTestProject } from './test_file_loader'
import { loadTypes } from '../type_loader'
import { nodeSanityCheck } from '../nodes/tests/test_utils'

describe('python whole file loading', () => {
  beforeAll(() => {
    loadTypes()
  })

  test('load blank file', async () => {
    const proj = await loadTestProject('blank', 'empty main.py')
    const pythonFile = await proj.getDefaultPackage().getLoadedFile('main.py')

    expect(pythonFile.rootNode.type).toEqual(PYTHON_FILE)
    const rootNode = pythonFile.rootNode as PythonFile
    nodeSanityCheck(rootNode)

    const parseTree = rootNode.generateParseTree(new ParseMapper())
    expect(parseTree).not.toBe(null)
    expect(parseTree).toBeDefined()

    const testWalker = new TestWalker()
    testWalker.walk(parseTree)
  })

  test('load all example projects', async () => {
    const example_projects = ['helloname', 'secret_password', 'temperature_conversion']
    return Promise.all(
      example_projects.map(async (projectID) => {
        const proj = await loadTestProject(projectID, `Example project ${projectID}`)
        const pythonFile = await proj.getDefaultPackage().getLoadedFile('main.py')

        expect(pythonFile.rootNode.type).toEqual(PYTHON_FILE)
        const rootNode = pythonFile.rootNode as PythonFile
        nodeSanityCheck(rootNode)

        const parseTree = rootNode.generateParseTree(new ParseMapper())
        expect(parseTree).not.toBe(null)
        expect(parseTree).toBeDefined()

        const testWalker = new TestWalker()
        testWalker.walk(parseTree)
      })
    )
  })

  test('load with missing properties and childsets', async () => {
    // Series of expression and statements which are missing childsets or properties.
    const proj = await loadTestProject('missing_values', 'missing values')
    const pythonFile = await proj.getDefaultPackage().getLoadedFile('main.py')

    expect(pythonFile.rootNode.type).toEqual(PYTHON_FILE)
    const rootNode = pythonFile.rootNode as PythonFile
    nodeSanityCheck(rootNode)

    const parseTree = rootNode.generateParseTree(new ParseMapper())
    expect(parseTree).not.toBe(null)
    expect(parseTree).toBeDefined()

    const testWalker = new TestWalker()
    testWalker.walk(parseTree)
  })

  test('load with missing expressions where an expression is required', async () => {
    const proj = await loadTestProject('missing_expressions', 'missing expressions')
    const pythonFile = await proj.getDefaultPackage().getLoadedFile('main.py')

    expect(pythonFile.rootNode.type).toEqual(PYTHON_FILE)
    const rootNode = pythonFile.rootNode as PythonFile
    nodeSanityCheck(rootNode)

    const parseTree = rootNode.generateParseTree(new ParseMapper())
    expect(parseTree).not.toBe(null)
    expect(parseTree).toBeDefined()

    const testWalker = new TestWalker()
    testWalker.walk(parseTree)
  })
})
