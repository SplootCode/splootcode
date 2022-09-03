import { CursorPosition, NodeCursor } from './selection'

type LineEntry = CursorEntry | NodeEntry

export enum CursorType {
  Primary = 0,
  LineStart,
  LineEnd,
}

interface CursorEntry {
  isCursor: true
  xCoord: number
  nodeCursors: [NodeCursor, CursorType][]
}

interface NodeEntry {
  isCursor: false
  xCoord: number
  nodeCursor: NodeCursor
}

interface Line {
  yCoord: number
  marginTop: number
  entries: LineEntry[]
}

export class CursorMap {
  lines: Line[]
  linesIndex: { [key: number]: Line }
  supplimentaryCursors: [number, number, NodeCursor][]

  constructor() {
    this.lines = []
    this.linesIndex = {}
    this.supplimentaryCursors = []
  }

  registerSupplementaryCursor(nodeCursor: NodeCursor, x: number, y: number) {
    this.supplimentaryCursors.push([x, y, nodeCursor])
  }

  registerNodeStart(nodeCursor: NodeCursor, x: number, y: number, marginTop = 0) {
    // Check if this is a new line
    let lineMap: Line
    if (y + marginTop in this.linesIndex) {
      lineMap = this.linesIndex[y + marginTop]
      lineMap.yCoord = y
      lineMap.marginTop = Math.max(lineMap.marginTop, marginTop)
      this.linesIndex[y] = lineMap
    } else if (y in this.linesIndex) {
      lineMap = this.linesIndex[y]
      lineMap.marginTop = Math.max(lineMap.marginTop, marginTop)
      this.linesIndex[y + marginTop] = lineMap
    } else {
      // new Line
      lineMap = {
        yCoord: y,
        marginTop: marginTop,
        entries: [],
      }
      this.linesIndex[y] = lineMap
      this.linesIndex[y + marginTop] = lineMap
      this.lines.push(lineMap)
    }

    const lineEntry: NodeEntry = {
      isCursor: false,
      xCoord: x,
      nodeCursor: nodeCursor,
    }
    lineMap.entries.push(lineEntry)
  }

  registerCursorStart(nodeCursor: NodeCursor, x: number, y: number, cursorType: CursorType) {
    // Don't allow invalid primary cursors
    if (cursorType == CursorType.Primary && !nodeCursor.listBlock.allowInsertCursor(nodeCursor.index)) {
      return
    }

    // Check if this is a new line
    let lineMap: Line
    if (!(y in this.linesIndex)) {
      // new Line
      lineMap = {
        yCoord: y,
        marginTop: 0,
        entries: [],
      }
      this.linesIndex[y] = lineMap
      this.lines.push(lineMap)
    } else {
      lineMap = this.linesIndex[y]
    }

    const lineEntry: CursorEntry = {
      isCursor: true,
      xCoord: x,
      nodeCursors: [[nodeCursor, cursorType]],
    }
    lineMap.entries.push(lineEntry)
  }

  registerEndCursor(nodeCursor: NodeCursor, x: number, y: number) {
    const listBlock = nodeCursor.listBlock
    if (listBlock === null) {
      // This is the toplevel node and can't be selected.
      return
    }

    if (!(y in this.linesIndex)) {
      console.warn("Attempting to add endCursor to line that doesn't exist")
      return
    }

    const line = this.linesIndex[y]
    line.entries.sort((a, b) => {
      return a.xCoord - b.xCoord
    })
    const lastEntry = line.entries[line.entries.length - 1]
    if (lastEntry.isCursor) {
      lastEntry.nodeCursors.push([nodeCursor, CursorType.LineEnd])
    } else {
      const lineEntry: CursorEntry = {
        isCursor: true,
        xCoord: x,
        nodeCursors: [[nodeCursor, CursorType.LineEnd]],
      }
      line.entries.push(lineEntry)
    }
  }

  dedupdeAndSort() {
    this.lines.sort((a, b) => {
      return a.yCoord - b.yCoord
    })

    for (const [x, y, nodeCursor] of this.supplimentaryCursors) {
      if (y in this.linesIndex) {
        this.linesIndex[y].entries.push({
          isCursor: true,
          nodeCursors: [[nodeCursor, CursorType.Primary]],
          xCoord: x,
        })
      }
    }

    for (const line of this.lines) {
      const entries = line.entries
      entries.sort((a, b) => {
        return a.xCoord - b.xCoord
      })
      const newEntries = entries.slice(0, 1)
      let prev = newEntries[0]
      for (const entry of entries.slice(1)) {
        if (entry.isCursor && prev.isCursor && entry.xCoord - prev.xCoord < 1) {
          prev.nodeCursors.push(...entry.nodeCursors)
        } else {
          newEntries.push(entry)
          prev = entry
        }
      }
      line.entries = newEntries
    }
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
    return line.entries
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
      return [cursorEntry.xCoord + 3, line.yCoord + line.marginTop]
    }
    return [cursorEntry.xCoord, line.yCoord + line.marginTop]
  }

  getNodeCursorsForCursorPosition(position: CursorPosition): NodeCursor[] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      return cursorEntry.nodeCursors.map(([cursor, type]) => cursor)
    }
    return []
  }

  getLineEndCursorsForCursorPosition(position: CursorPosition): NodeCursor[] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      return cursorEntry.nodeCursors
        .filter(([cursor, type]) => type === CursorType.LineEnd)
        .map(([cursor, type]) => cursor)
    }
    return []
  }

  getLineStartCursorsForCursorPosition(position: CursorPosition): NodeCursor[] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      return cursorEntry.nodeCursors
        .filter(([cursor, type]) => type === CursorType.LineStart)
        .map(([cursor, type]) => cursor)
    }
    return []
  }

  getMultiSelectCursorForCursorPosition(position: CursorPosition): NodeCursor {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (!cursorEntry.isCursor) {
      const nodeEntry = cursorEntry as NodeEntry
      return nodeEntry.nodeCursor
    } else {
      return this.getNodeCursorsForCursorPosition(position)[0]
    }
  }

  getAutocompleteCursorsForCursorPosition(position: CursorPosition): NodeCursor[] {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      if (cursorEntry.nodeCursors.length === 1) {
        return cursorEntry.nodeCursors
          .filter(([cursor, type]) => type !== CursorType.LineEnd)
          .map(([cursor, type]) => cursor)
      }
      return cursorEntry.nodeCursors
        .filter(([cursor, type]) => type === CursorType.Primary)
        .map(([cursor, type]) => cursor)
    }
    return []
  }

  getSingleNodeForCursorPosition(position: CursorPosition): NodeCursor {
    const entries = this.getEntryListForLineIndex(position.lineIndex)
    const cursorEntry = entries[position.entryIndex]
    if (cursorEntry.isCursor) {
      throw new Error("Attempting to get single node for postion that's actually a cursor")
    }
    return (cursorEntry as NodeEntry).nodeCursor
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

  getCursorAtStartOfLine(position: CursorPosition): [CursorPosition, boolean, number] {
    const { lineIndex } = position
    const entries = this.getEntryListForLineIndex(lineIndex)
    const entry = entries[0]
    return [{ lineIndex: lineIndex, entryIndex: 0 }, entry.isCursor, entry.xCoord]
  }

  getCursorAtEndOfLine(position: CursorPosition): [CursorPosition, boolean, number] {
    const { lineIndex } = position
    const entries = this.getEntryListForLineIndex(lineIndex)
    const xIndex = entries.length - 1
    const entry = entries[xIndex]
    return [{ lineIndex: lineIndex, entryIndex: xIndex }, entry.isCursor, entry.xCoord]
  }
}
