import type { Dirent, ReadStream, WriteStream } from 'fs'

import {
  FileSystem,
  FileWatcher,
  FileWatcherEventHandler,
  MkDirOptions,
  ParseNode,
  ParseTreeWalker,
  Stats,
  TmpfileOptions,
  typeshedDirEntries,
} from 'structured-pyright'

function file(name: string): Dirent {
  return {
    name: name,
    isFile: () => true,
    isDirectory: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  }
}

function dir(name: string): Dirent {
  return {
    name: name,
    isFile: () => false,
    isDirectory: () => true,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  }
}

export class PyodideFakeFileSystem implements FileSystem {
  private _hostedTypeshedBasePath: string
  private _knownStructuredFilePaths: Set<string>
  private _pyodide: any

  constructor(hostedTypeshedBasePath: string, pyodide: any) {
    this._hostedTypeshedBasePath = hostedTypeshedBasePath
    this._knownStructuredFilePaths = new Set()
    this._pyodide = pyodide
  }

  existsSync(path: string): boolean {
    switch (path) {
      case '/':
      case '/typeshed/typeshed-fallback':
        return true
    }

    if (this._knownStructuredFilePaths.has(path)) {
      return true
    }
    return this._pyodide.FS.analyzePath(path).exists
  }
  mkdirSync(path: string, options?: MkDirOptions): void {
    throw new Error('Method not implemented.')
  }
  chdir(path: string): void {
    throw new Error('Method not implemented.')
  }

  readdirEntriesSync(path: string): Dirent[] {
    if (path.startsWith('/typeshed/typeshed-fallback')) {
      let newPath = path.substring('/typeshed/typeshed-fallback/'.length)
      if (newPath.endsWith('/')) {
        newPath = newPath.substring(0, newPath.length - 1)
      }
      return typeshedDirEntries[newPath].map((entry) => {
        if (entry.isDir) {
          return dir(entry.name)
        }
        return file(entry.name)
      })
    }

    let out: Dirent[] = []

    try {
      // Search pyodide filesystem
      const results = (this._pyodide.FS.readdir(path) as string[])
        .filter((entry) => !['.', '..'].includes(entry))
        .map((entry): Dirent => {
          const out = this._pyodide.FS.analyzePath(path + '/' + entry)

          const mode = out.object.mode

          return {
            name: out.name,
            isFile: () => this._pyodide.FS.isFile(mode),
            isDirectory: () => this._pyodide.FS.isDir(mode),
            isBlockDevice: () => false,
            isSocket: () => false,
            isSymbolicLink: () => false,
            isCharacterDevice: () => false,
            isFIFO: () => false,
          }
        })

      out = out.concat(results)
    } catch (e) {
      // Directory doesn't exist. Return empty array.
    }

    if (path === '/') {
      const results = [...this._knownStructuredFilePaths]
        .filter((key) => {
          if (key.startsWith(path)) {
            return key.substring(path.length).indexOf('/') === -1
          }
          return false
        })
        .map((key) => {
          return file(key.substring(path.length))
        })

      out = out.concat(results)
    }

    return out
  }
  readdirSync(path: string): string[] {
    throw new Error('Method not implemented.')
  }
  readFileSync(path: string, encoding?: null): Buffer
  readFileSync(path: string, encoding: BufferEncoding): string
  readFileSync(path: string, encoding?: BufferEncoding | null): string | Buffer
  readFileSync(path: any, encoding?: any): string | Buffer {
    // Choosing to return an empty VERSIONS file rather than editing
    // the code to fetch it asynchronously like all the other typeshed files.
    if (path === '/typeshed/typeshed-fallback/stdlib/VERSIONS') {
      return ''
    }

    return this._pyodide.FS.readFile(path, { encoding: encoding })
  }
  writeFileSync(path: string, data: string | Buffer, encoding: BufferEncoding | null): void {
    this._knownStructuredFilePaths.add(path)
  }
  statSync(path: string): Stats {
    if (path === '/typeshed/typeshed-fallback/stdlib/VERSIONS') {
      return {
        size: 100,
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
        isSymbolicLink: () => false,
      }
    }

    const out = this._pyodide.FS.stat(path)

    const mode = out.mode

    const stat = {
      size: out.size,
      isFile: () => this._pyodide.FS.isFile(mode),
      isDirectory: () => this._pyodide.FS.isDir(mode),
      isBlockDevice: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
    }

    return stat
  }
  unlinkSync(path: string): void {
    throw new Error('Method not implemented.')
  }
  realpathSync(path: string): string {
    throw new Error('Method not implemented.')
  }
  getModulePath(): string {
    return '/typeshed/'
  }
  createFileSystemWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
    throw new Error('Method not implemented.')
  }
  createReadStream(path: string): ReadStream {
    throw new Error('Method not implemented.')
  }
  createWriteStream(path: string): WriteStream {
    throw new Error('Method not implemented.')
  }
  copyFileSync(src: string, dst: string): void {
    throw new Error('Method not implemented.')
  }
  readFile(path: string): Promise<Buffer> {
    throw new Error('Method not implemented.')
  }
  readFileText = async (path: string, encoding?: BufferEncoding) => {
    if (path.startsWith('/typeshed/typeshed-fallback/')) {
      const newPath = path.substring('/typeshed/typeshed-fallback/'.length)
      const response = await fetch(this._hostedTypeshedBasePath + newPath)
      const text = await response.text()
      return text
    }

    return this._pyodide.FS.readFile(path, { encoding: 'utf8' })
  }
  tmpdir(): string {
    throw new Error('Method not implemented.')
  }
  tmpfile(options?: TmpfileOptions): string {
    throw new Error('Method not implemented.')
  }
  realCasePath(path: string): string {
    return path
  }
  isMappedFilePath(filepath: string): boolean {
    return false
  }
  getOriginalFilePath(mappedFilePath: string): string {
    // No file mapping
    return mappedFilePath
  }
  getMappedFilePath(originalFilepath: string): string {
    return originalFilepath
  }
  getUri(path: string): string {
    throw new Error('Method not implemented.')
  }
  isInZipOrEgg(path: string): boolean {
    throw new Error('Method not implemented.')
  }
}

export class IDFinderWalker extends ParseTreeWalker {
  toFind: number
  found: ParseNode | undefined

  constructor(toFind: number) {
    super()

    this.toFind = toFind
    this.found = null
  }

  walk(node: ParseNode): void {
    if (this.found) {
      return
    }

    if (node.id == this.toFind) {
      this.found = node
    }

    super.walk(node)
  }
}
