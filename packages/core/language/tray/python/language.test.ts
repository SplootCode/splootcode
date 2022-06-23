import { PythonLanguageTray } from './language'
import { TrayCategory, TrayEntry, TrayListing } from '../tray'
import { deserializeNode } from '../../type_registry'
import { loadTypes } from '../../type_loader'
import { nodeSanityCheck } from '../../types/python/tests/test_utils'

function flattenTrayEntries(category: TrayCategory): TrayEntry[] {
  const entries: TrayEntry[] = []
  category.entries.forEach((listing: TrayListing) => {
    if ('category' in listing) {
      entries.push(...flattenTrayEntries(listing))
    } else {
      entries.push(listing)
    }
  })
  return entries
}

describe('python tray entries', () => {
  beforeAll(() => {
    loadTypes()
  })

  test('sanity check all tray entries and examples', () => {
    const tray = PythonLanguageTray
    const allEntries = flattenTrayEntries(tray)
    // Make sure we are working with a valid set of tray entries
    expect(allEntries.length).toBeGreaterThan(10)
    allEntries.forEach((entry) => {
      const node = deserializeNode(entry.serializedNode)
      nodeSanityCheck(node)
      if (entry.examples && entry.examples.length !== 0) {
        entry.examples.forEach((example) => {
          example.serializedNodes.forEach((serNode) => {
            const node = deserializeNode(serNode)
            nodeSanityCheck(node)
          })
        })
      }
    })
  })
})
