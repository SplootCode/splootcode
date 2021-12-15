import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { NodeCursor } from './selection'

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
    if (!isFirstEntryCursor && line.parentListBlock.allowInsertCursor()) {
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

  getCursorByCoordinate(x: number, y: number): [NodeCursor, boolean] {
    const lineIndex = this.getLineIndexForYCoord(y)
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const cursorEntry = entries[xIndex]
    const nodeCursor = new NodeCursor(cursorEntry.listBlock, cursorEntry.index)
    return [nodeCursor, cursorEntry.isCursor]
  }

  getCursorLeftOfCoordinate(x: number, y: number): [NodeCursor, boolean, number, number] {
    const lineIndex = this.getLineIndexForYCoord(y)
    const entries = this.getEntryListForLineIndex(lineIndex)

    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    let entry = entries[xIndex]

    if (xIndex <= 0) {
      if (lineIndex > 0) {
        // Get last cursor for previous line.
        const line = this.lines[lineIndex - 1]
        const newEntries = this.getEntryListForLineIndex(lineIndex - 1)
        entry = newEntries[newEntries.length - 1]
        y = line.yCoord
      }
      return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, entry.xCoord, y]
    }

    entry = entries[xIndex - 1]
    return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, entry.xCoord, y]
  }

  getCursorRightOfCoordinate(x: number, y: number): [NodeCursor, boolean, number, number] {
    const lineIndex = this.getLineIndexForYCoord(y)
    const entries = this.getEntryListForLineIndex(lineIndex)

    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    let entry = entries[xIndex]

    if (xIndex >= entries.length - 1) {
      if (lineIndex < this.lines.length - 1) {
        // Get first cursor for next line.
        const line = this.lines[lineIndex + 1]
        entry = this.getEntryListForLineIndex(lineIndex + 1)[0]
        y = line.yCoord
      }
      return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, entry.xCoord, y]
    }

    entry = entries[xIndex + 1]
    return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, entry.xCoord, y]
  }

  getCursorUpOfCoordinate(x: number, y: number): [NodeCursor, boolean, number, number] {
    let lineIndex = this.getLineIndexForYCoord(y)
    if (lineIndex != 0) {
      lineIndex -= 1
      y = this.lines[lineIndex].yCoord
    }
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const entry = entries[xIndex]
    return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, x, y]
  }

  getCursorDownOfCoordinate(x: number, y: number): [NodeCursor, boolean, number, number] {
    let lineIndex = this.getLineIndexForYCoord(y)
    if (lineIndex < this.lines.length - 1) {
      lineIndex += 1
      y = this.lines[lineIndex].yCoord
    }
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = CursorMap.getEntryIndexForXCoord(entries, x)
    const entry = entries[xIndex]
    return [new NodeCursor(entry.listBlock, entry.index), entry.isCursor, x, y]
  }
}
