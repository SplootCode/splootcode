import { Terminal } from 'xterm'

/**
 * A tty is a particular device file, that sits between the shell and the terminal.
 * It acts an an interface for the shell and terminal to read/write from,
 * and communicate with one another
 */
export default class WasmTTY {
  private xterm: Terminal

  private inputCursorX: number
  private inputCursorY: number
  private inputStartCursorX: number
  private inputStartCursorY: number
  private input: string[]
  private inputSplit: string[][]

  constructor(xterm: Terminal) {
    this.xterm = xterm
    this.input = []
    this.inputSplit = []
    this.inputCursorX = 0
    this.inputCursorY = 0
  }

  async read() {
    this.input = []
    this.inputSplit = []

    const promise = new Promise((resolve) => {
      this.xterm.write('\x00', () => resolve(true))
    }).then(() => {
      const buf = this.xterm.buffer.active
      this.inputStartCursorX = buf.cursorX
      this.inputStartCursorY = buf.cursorY + buf.baseY
      this.inputCursorX = this.inputStartCursorX
      this.inputCursorY = 0
      this.xterm.focus()
    })

    return promise
  }

  reflowInput() {
    const cols = this.xterm.cols
    const lines: string[][] = []

    const inputChars = Array.from(this.input)

    const firstLine = inputChars.slice(0, cols - this.inputStartCursorX)
    lines.push(firstLine)
    let index = firstLine.length
    let lastLineFull = firstLine.length === cols - this.inputStartCursorX
    while (index < inputChars.length) {
      const line = inputChars.slice(index, index + cols)
      lines.push(line)
      index += line.length
      lastLineFull = line.length == cols
    }
    if (lastLineFull) {
      lines.push([''])
    }

    // TODO: Redraw relevant lines
    this.inputSplit = lines
  }

  getInput(): string {
    return this.input.join('')
  }

  /**
   * Prints a message and properly handles new-lines
   */
  print(message: string) {
    const normInput = message.replace(/[\r\n]+/g, '\n').replace(/\n/g, '\r\n')
    if (normInput.length === 0) {
      this.xterm.write(normInput)
      return
    }
    this.xterm.write(normInput)
  }

  /**
   * Erase a character at cursor location
   */
  handleCursorErase = (backspace: boolean) => {
    if (backspace) {
      const lineOffset = this.getLineOffset()
      if (lineOffset === 0) {
        return
      }
      const inputCursor = this.getCurrentInputOffset()
      const newInput = [...this.input.slice(0, inputCursor - 1), ...this.input.slice(inputCursor)]
      this.writeCursorXPosition(this.inputCursorX - 1)
      this.input = newInput
      this.reflowInput()
      this.xterm.write('\x1B[P')
    } else {
      const inputCursor = this.inputCursorX - this.inputStartCursorX
      const newInput = [...this.input.slice(0, inputCursor), ...this.input.slice(inputCursor + 1)]
      this.input = newInput
      this.reflowInput()
      this.xterm.write('\x1B[P')
    }
  }

  addInputLine() {
    this.xterm.write('\r\n')
    this.inputCursorY += 1
    this.inputCursorX = 0
  }

  /**
   * Insert character at cursor location
   */
  handleCursorInsert = (data: string) => {
    const arrData = Array.from(data)
    const inputCursor = this.getCurrentInputOffset()
    this.input.splice(inputCursor, 0, ...arrData)
    // const newInput = this._input.slice(0, inputCursor) + data + this._input.substring(inputCursor)

    // Make space for the data (pushes other chars to the right)
    this.xterm.write(`\x1B[${arrData.length}@`)
    this.xterm.write(data)

    this.inputCursorX += arrData.length

    if (this.xterm.cols - this.inputCursorX <= 0) {
      this.addInputLine()
    }

    this.reflowInput()
  }

  /**
   * Clears the entire Tty
   *
   * This function will erase all the lines that display on the tty,
   * and move the cursor in the beginning of the first line of the prompt.
   */
  clearTty() {
    // Clear the screen
    this.xterm.write('\u001b[2J')
    // Set the cursor to 0, 0
    this.xterm.write('\u001b[0;0H')
    this.inputCursorX = 0
  }

  getCurrentInputOffset(): number {
    return this.inputCursorY * this.xterm.cols + this.inputCursorX - this.inputStartCursorX
  }

  getLineOffset(): number {
    if (this.inputCursorY === 0) {
      return this.inputCursorX - this.inputStartCursorX
    }
    return this.inputCursorX
  }

  // CTRL+K, returns clipboard contents
  cutInputRight(): string {
    const inputCursor = this.getCurrentInputOffset()
    const newInput = this.input.slice(0, inputCursor)
    const cutNum = this.input.length - newInput.length
    if (cutNum > 0) {
      this.xterm.write(`\x1B[${cutNum}P`)
    }
    const res = this.input.slice(inputCursor)
    this.input = newInput
    return res.join('')
  }

  cutInputLeft(): string {
    const inputCursor = this.getCurrentInputOffset()
    const newInput = this.input.slice(inputCursor)
    const cutNum = this.input.length - newInput.length
    this.writeCursorXPosition(this.inputStartCursorX)
    if (cutNum > 0) {
      this.xterm.write(`\x1B[${cutNum}P`)
    }
    const res = this.input.slice(0, inputCursor)
    this.input = newInput
    return res.join('')
  }

  handleCursorMove(dir: number) {
    this.writeCursorXPosition(this.inputCursorX + dir)
  }

  private writeCursorXPosition(newCursor: number) {
    let newCol = newCursor
    const prevCol = this.inputCursorX

    const min = this.inputCursorY === 0 ? this.inputStartCursorX : 0
    const max = min + this.inputSplit[this.inputCursorY].length

    if (newCol < min) {
      newCol = min
    }
    if (newCol > max) {
      newCol = max
    }

    if (newCol > this.inputStartCursorX + this.input.length) {
      newCol = this.inputStartCursorX + this.input.length
    }

    // Adjust horizontally
    if (newCol > prevCol) {
      for (let i = prevCol; i < newCol; ++i) this.xterm.write('\x1B[C')
    } else {
      for (let i = newCol; i < prevCol; ++i) this.xterm.write('\x1B[D')
    }

    // Set new offset
    this.inputCursorX = newCol
  }

  moveCursorToEnd() {
    const end = this.inputStartCursorX + this.input.length
    this.writeCursorXPosition(end)
  }

  moveCursorToStart() {
    if (this.inputCursorY == 0) {
      this.writeCursorXPosition(this.inputStartCursorX)
    }
  }
}
