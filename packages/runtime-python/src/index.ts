import { initializeConsole } from './runtime'

export function initialize(editorDomain: string, workerURL: string) {
  initializeConsole(editorDomain, workerURL)
}
