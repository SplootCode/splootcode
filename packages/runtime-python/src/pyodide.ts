export function tryNonModuleLoadPyodide() {
  // If we're not in a module context (prod build is non-module)
  // Then we need to imoprt Pyodide this way, but it fails in a module context (local dev).
  if (importScripts) {
    try {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')
    } catch (e) {
      console.warn(e)
    }
  }
}

export async function tryModuleLoadPyodide() {
  // @ts-ignore
  if (typeof loadPyodide == 'undefined') {
    // import is a syntax error in non-module context (which we need to be in for Firefox...)
    // But we use module context for local dev because... Vite does that.
    await eval("import('https://cdn.jsdelivr.net/pyodide/v0.21.3/full/pyodide.js')")
  }
}

export async function setupPyodide(urls: string[]) {
  // @ts-ignore
  const pyodide = await loadPyodide({ fullStdLib: false, indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.21.3/full/' })

  await pyodide.loadPackage('micropip')
  const micropip = pyodide.pyimport('micropip')
  const promises = [
    ...urls.map((url) => micropip.install(url)),
    micropip.install('flask'),
    micropip.install('serverless_wsgi'),
    micropip.install('types-requests'),
    micropip.install('ast-comments'),
  ]

  await Promise.all(promises)

  return pyodide
}

export const loadDependencies = async (pyodide: any, newDependencies: Map<string, string>) => {
  const micropip = pyodide.pyimport('micropip')

  const imports = Array.from(newDependencies.entries())
    .map(([dependencyName, version]): any => {
      let types = []

      if (dependencyName === 'pandas') {
        types = ['pandas-stubs']
      }

      return [dependencyName, ...types]
    })
    .flat()
    .map((dependency) => micropip.install(dependency))

  await Promise.all(imports)
}
