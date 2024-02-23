import { Dependency } from '@splootcode/core'
import { StaticURLs } from './static_urls'

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
    micropip.install('types-requests==2.28.1'),
    micropip.install('ast-comments'),
  ]

  await Promise.all(promises)

  return pyodide
}

export const loadDependencies = async (pyodide: any, newDependencies: Dependency[], urls: StaticURLs) => {
  const micropip = pyodide.pyimport('micropip')

  const imports = newDependencies
    .map(({ name, version }): any => {
      let types = []

      if (name === 'pandas') {
        types = ['pandas-stubs~=1.5.3']
      } else if (name === 'streamlit') {
        return [urls.pyarrowPackageURL, urls.streamlitPackageURL]
      } else if (name === 'requests') {
        return [urls.requestsPackageURL]
      }

      return [name, ...types]
    })
    .map((dependencies) => micropip.install(dependencies))

  await Promise.all(imports)
}
