import type { doc } from '../core'
import { supervisely } from './supervisely'

export type ExportFormat = {
  name: string
  extension: string
  /** The whole export as one file, for the model `name` with its labels. */
  write(name: string, classes: doc.Cls[]): Blob
}

/** What Export can write; the first is the default. */
export const EXPORTS: ExportFormat[] = [
  { name: 'Supervisely', extension: 'tar', write: supervisely },
]
