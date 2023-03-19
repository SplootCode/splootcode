import { SerializedNode } from '@splootcode/core'

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
  registerObservers: (setDirty: () => void) => void
  deregisterObservers: () => void
  isValid: () => boolean
  getUpdatedFileState: () => Promise<Map<string, FileSpec>>
  getAllFileState: () => Promise<Map<string, FileSpec>>
  getEnvVars: () => Map<string, string>
}
