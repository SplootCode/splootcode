import { CapturePayload, SerializedNode } from '@splootcode/core'
import { PythonModuleSpec } from '@splootcode/language-python'

export type FileSpec = SplootFile | BlobFile
export interface SplootFile {
  type: 'sploot'
  content: SerializedNode
}

export interface BlobFile {
  type: 'blob'
  content: Uint8Array
}

export interface FileChangeWatcher {
  onPythonRuntimeIsReady: () => Promise<void>
  updateRuntimeCaptures: (captures: Map<string, CapturePayload>) => void
  registerObservers: (setDirty: () => void, loadModule: (moduleName: string) => void) => void
  deregisterObservers: () => void
  recievedModuleInfo: (payload: PythonModuleSpec) => void
  isValid: () => boolean
  getUpdatedFileState: () => Promise<Map<string, FileSpec>>
  getAllFileState: () => Promise<Map<string, FileSpec>>
}
