import { SerializedNode } from '../type_registry'

export type TrayListing = TrayCategory | TrayEntry

export interface TrayCategory {
  category: string
  entries: TrayListing[]
}

export interface TrayExample {
  serializedNode: SerializedNode
  description: string
}

export interface TrayEntry {
  key: string
  title?: string
  serializedNode?: SerializedNode
  abstract: string
  examples?: TrayExample[]
}
