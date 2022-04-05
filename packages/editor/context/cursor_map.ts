import { CursorPosition, NodeCursor } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'

interface LineEntry {
  xCoord: number
  listBlock: RenderedChildSetBlock
  index: number
  isCursor: boolean
}

interface LineMap {
  yCoord: number
  entries: LineEntry[]
  parentListBlock: RenderedChildSetBlock
  parentIndex: number
}

export class CursorMap {
  lines: LineMap[]
  linesIndex: { [key: number]: LineMap }

  constructor() {
    this.lines = []
    this.linesIndex = {}
  }

  registerLineCursor(listBlock: RenderedChildSetBlock, index: number, y: number) {
    if (listBlock === null) {
      // This is the toplevel node and can't be selected.
      return
    }
    // Don't allow invalid cursors
    if (!listBlock.allowInsertCursor(index)) {
      return
    }
    // Check if this is a new line
    let lineMap: LineMap
    if (!(y in this.linesIndex)) {
      // new Line
      lineMap = {
        yCoord: y,
        entries: [],
        parentListBlock: null,
        parentIndex: null,
      }
      this.linesIndex[y] = lineMap
      this.lines.push(lineMap)
      this.lines.sort((a, b) => {
        return a.yCoord - b.yCoord
      })
    } else {
      lineMap = this.linesIndex[y]
    }
    lineMap.parentListBlock = listBlock
    lineMap.parentIndex = index
  }

  registerCursorStart(listBlock: RenderedChildSetBlock, index: number, x: number, y: number, isCursor: boolean) {
    if (listBlock === null) {
      // This is the toplevel node and can't be selected.
      return
    }

    // Don't allow invalid cursors
    if (isCursor && !listBlock.allowInsertCursor(index)) {
      return
    }

    // Check if this is a new line
    let lineMap: LineMap
    if (!(y in this.linesIndex)) {
      // new Line
      lineMap = {
        yCoord: y,
        entries: [],
        parentListBlock: null,
        parentIndex: null,
      }
      this.linesIndex[y] = lineMap
      this.lines.push(lineMap)
      this.lines.sort((a, b) => {
        return a.yCoord - b.yCoord
      })
    } else {
      lineMap = this.linesIndex[y]
    }

    const lineEntry: LineEntry = {
      index: index,
      isCursor: isCursor,
      listBlock: listBlock,
      xCoord: x,
    }
    lineMap.entries.push(lineEntry)
    lineMap.entries.sort((a, b) => {
      return a.xCoord - b.xCoord
    })
  }

  getLineIndexForYCoord(yCoord: number): number {
    let lineIndex = 0
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i]
      if (yCoord < line.yCoord) {
        return lineIndex
      }
      lineIndex = i
    }
    return this.lines.length - 1
  }

  getEntryListForLineIndex(lineIndex: number): LineEntry[] {
    const line = this.lines[lineIndex]

    const entries = line.entries.slice()
    const isFirstEntryCursor = entries.length > 0 && entries[0].isCursor
    if (!isFirstEntryCursor && line.parentListBlock.allowInsertCursor(line.parentIndex)) {
      entries.unshift({
        index: line.parentIndex,
        listBlock: line.parentListBlock,
        isCursor: true,
        xCoord: 0,
      })
    }

    return entries
  }

  static getEntryIndexForXCoord(entries: LineEntry[], xCoord: number) {
    let index = 0
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.xCoord > xCoord) {
        break
      }
      index = i
    }
    return index
  }

  getCursorPositionByCoordinate(x: number, y: number): [CursorPosition, boolean] {
    const lineIndex = this.getLineIndexForYCoord(y)
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const cursorEntry = entries[xIndex]
    return [
      {
        lineIndex: lineIndex,
        entryIndex: xIndex,
      },
      cursorEntry.isCursor,
    ]
  }

  isValid(position: CursorPosition): boolean {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry) {
      return true
    }
    return false
  }

  getCoordinates(position: CursorPosition): [number, number] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const line = this.lines[position.lineIndex]
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      return [cursorEntry.xCoord + 3, line.yCoord]
    }
    return [cursorEntry.xCoord, line.yCoord]
  }

  getNodeCursorsForCursorPosition(position: CursorPosition): NodeCursor[] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    return [new NodeCursor(cursorEntry.listBlock, cursorEntry.index)]
  }

  getSingleNodeForCursorPosition(position: CursorPosition): NodeCursor {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      throw new Error("Attempting to get single node for postion that's actually a cursor")
    }
    return new NodeCursor(cursorEntry.listBlock, cursorEntry.index)
  }

  getCursorLeftOfPosition(position: CursorPosition): [CursorPosition, boolean, number, number] {
    const { lineIndex, entryIndex } = position
    let line = this.lines[lineIndex]

    const entries = this.getEntryListForLineIndex(lineIndex)
    let entry = entries[entryIndex]

    if (entryIndex <= 0) {
      if (lineIndex > 0) {
        // Get last cursor for previous line.
        line = this.lines[lineIndex - 1]
        const newEntries = this.getEntryListForLineIndex(lineIndex - 1)
        entry = newEntries[newEntries.length - 1]
        return [
          { lineIndex: lineIndex - 1, entryIndex: newEntries.length - 1 },
          entry.isCursor,
          entry.xCoord,
          line.yCoord,
        ]
      }
      return [{ lineIndex: lineIndex, entryIndex: entryIndex }, entry.isCursor, entry.xCoord, line.yCoord]
    }

    entry = entries[entryIndex - 1]
    return [{ lineIndex: lineIndex, entryIndex: entryIndex - 1 }, entry.isCursor, entry.xCoord, line.yCoord]
  }

  getCursorRightOfPosition(position: CursorPosition): [CursorPosition, boolean, number, number] {
    const { lineIndex, entryIndex } = position
    let line = this.lines[lineIndex]
    const entries = this.getEntryListForLineIndex(lineIndex)
    let entry = entries[entryIndex]

    if (entryIndex >= entries.length - 1) {
      if (lineIndex < this.lines.length - 1) {
        // Get first cursor for next line.
        line = this.lines[lineIndex + 1]
        entry = this.getEntryListForLineIndex(lineIndex + 1)[0]
        return [{ lineIndex: lineIndex + 1, entryIndex: 0 }, entry.isCursor, entry.xCoord, line.yCoord]
      }
      // Return same cursor as before
      return [{ lineIndex: lineIndex, entryIndex: entryIndex }, entry.isCursor, entry.xCoord, line.yCoord]
    }

    entry = entries[entryIndex + 1]
    return [{ lineIndex: lineIndex, entryIndex: entryIndex + 1 }, entry.isCursor, entry.xCoord, line.yCoord]
  }

  getCursorUpOfPosition(x: number, y: number, position: CursorPosition): [CursorPosition, boolean, number, number] {
    let { lineIndex } = position

    if (lineIndex != 0) {
      lineIndex -= 1
      y = this.lines[lineIndex].yCoord
    }
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const entry = entries[xIndex]
    return [{ lineIndex: lineIndex, entryIndex: xIndex }, entry.isCursor, x, y]
  }

  getCursorDownOfPosition(x: number, y: number, position: CursorPosition): [CursorPosition, boolean, number, number] {
    let { lineIndex } = position
    if (lineIndex < this.lines.length - 1) {
      lineIndex += 1
      y = this.lines[lineIndex].yCoord
    }
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const entry = entries[xIndex]
    return [{ lineIndex: lineIndex, entryIndex: xIndex }, entry.isCursor, x, y]
  }
}
