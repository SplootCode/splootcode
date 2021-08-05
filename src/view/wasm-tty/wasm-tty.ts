import { Terminal } from "xterm";

export interface ActivePrompt {
  promise: Promise<any>;
  resolve?: (what: string) => any;
  reject?: (error: Error) => any;
}

/**
 * A tty is a particular device file, that sits between the shell and the terminal.
 * It acts an an interface for the shell and terminal to read/write from,
 * and communicate with one another
 */
export default class WasmTTY {
  xterm: Terminal;

  _termSize: {
    cols: number;
    rows: number;
  };
  _cursor: number;
  _inputStartCursor: number;
  _input: string;

  constructor(xterm: Terminal) {
    this.xterm = xterm;

    this._termSize = {
      cols: this.xterm.cols,
      rows: this.xterm.rows,
    };
    this._input = "";
    this._cursor = 0;
  }

  /**
   * Function to return a deconstructed readPromise
   */
  _getAsyncRead() {
    let readResolve;
    let readReject;
    const readPromise = new Promise((resolve, reject) => {
      readResolve = (response: string) => {
        resolve(response);
      };
      readReject = reject;
    });

    return {
      promise: readPromise,
      resolve: readResolve,
      reject: readReject,
    };
  }

  /**
   * Return a promise that will resolve when the user has completed
   * typing a single line
   */
  read(): ActivePrompt {
    this._input = "";
    this._inputStartCursor = this._cursor

    return {
      ...this._getAsyncRead(),
    };
  }

  /**
   * Return a promise that will be resolved when the user types a single
   * character.
   *
   * This can be active in addition to `.read()` and will be resolved in
   * priority before it.
   */
  readChar(promptPrefix: string): ActivePrompt {
    if (promptPrefix.length > 0) {
      this.print(promptPrefix);
    }

    return {
      ...this._getAsyncRead(),
    };
  }

  /**
   * Prints a message and changes line
   */
  println(message: string) {
    this.print(message + "\n");
  }

  /**
   * Prints a message and properly handles new-lines
   */
  print(message: string) {
    const normInput = message.replace(/[\r\n]+/g, "\n").replace(/\n/g, "\r\n");
    if (normInput.length === 0 ||  normInput[normInput.length - 1] === '\n') {
      this.xterm.write(normInput);
      this._cursor = 0;
      return;
    }
    
    if (normInput.includes('\r\n')) {
      let split = normInput.split('\r\n')
      let last = split[split.length -1]
      this._cursor = last.length;
    } else {
      this._cursor += normInput.length;
    }
    this.xterm.write(normInput);
  }

  /**
   * Prints a list of items using a wide-format
   */
  printWide(items: Array<string>, padding = 2) {
    if (items.length === 0) return this.println("");

    // Compute item sizes and matrix row/cols
    const itemWidth =
      items.reduce((width, item) => Math.max(width, item.length), 0) + padding;
    const wideCols = Math.floor(this._termSize.cols / itemWidth);
    const wideRows = Math.ceil(items.length / wideCols);

    // Print matrix
    let i = 0;
    for (let row = 0; row < wideRows; ++row) {
      let rowStr = "";

      // Prepare columns
      for (let col = 0; col < wideCols; ++col) {
        if (i < items.length) {
          let item = items[i++];
          item += " ".repeat(itemWidth - item.length);
          rowStr += item;
        }
      }
      this.println(rowStr);
    }
  }

  /**
   * Erase a character at cursor location
   */
   handleCursorErase = (backspace: boolean) => {
    if (backspace) {
      if (this._cursor <= 0 || this._cursor <= this._inputStartCursor) {
        return;
      }
      const inputCursor = this._cursor - this._inputStartCursor
      const newInput =
        this.getInput().substr(0, inputCursor - 1) +
        this.getInput().substr(inputCursor);
      this._writeCursorPosition(this.getCursor() - 1);
      this._input = newInput;
      this.xterm.write("\x1B[P");
    } else {
      const inputCursor = this._cursor - this._inputStartCursor
      const newInput =
        this.getInput().substr(0, inputCursor) +
        this.getInput().substr(inputCursor + 1);
      this._input = newInput;
      this.xterm.write("\x1B[P");
    }
  };

  /**
   * Insert character at cursor location
   */
  handleCursorInsert = (data: string) => {
    const inputCursor = this.getInputCursor()
    const newInput = this._input.substr(0, inputCursor) + data + this._input.substr(inputCursor);
    
    // Make space for the data (pushes other chars to the right)
    this.xterm.write(`\x1B[${data.length}@`)
    this.print(data)
    this._input = newInput;
  };

  /**
   * Clears the entire Tty
   *
   * This function will erase all the lines that display on the tty,
   * and move the cursor in the beginning of the first line of the prompt.
   */
  clearTty() {
    // Clear the screen
    this.xterm.write("\u001b[2J");
    // Set the cursor to 0, 0
    this.xterm.write("\u001b[0;0H");
    this._cursor = 0;
  }

  /**
   * Function to get the terminal size
   */
  getTermSize(): { rows: number; cols: number } {
    return this._termSize;
  }

  /**
   * Function to get the current input in the line
   */
  getInput(): string {
    return this._input;
  }

  /**
   * Function to get the current cursor
   */
  getCursor(): number {
    return this._cursor;
  }

  /**
   * Function to get the size (columns and rows)
   */
  getSize(): { cols: number; rows: number } {
    return this._termSize;
  }

  getInputCursor() : number {
    return this._cursor - this._inputStartCursor;
  }

  // CTRL+K, returns clipboard contents
  cutInputRight() : string {
    const inputCursor = this.getInputCursor()
    const newInput = this._input.substring(0, inputCursor);
    const cutNum = this._input.length - newInput.length
    if (cutNum > 0) {
      this.xterm.write(`\x1B[${cutNum}P`)
    }
    const res = this._input.substring(inputCursor);
    this._input = newInput;
    return res;
  }

  cutInputLeft() : string {
    const inputCursor = this.getInputCursor()
    const newInput = this._input.substring(inputCursor);
    const cutNum = this._input.length - newInput.length
    this._writeCursorPosition(this._inputStartCursor)
    if (cutNum > 0) {
      this.xterm.write(`\x1B[${cutNum}P`)
    }
    const res = this._input.substring(0, inputCursor)
    this._input = newInput;
    return res;
  }

  handleCursorMove(dir: number) {
    this._writeCursorPosition(this._cursor + dir)
  }

  _writeCursorPosition(newCursor: number) {
    let newCol = newCursor;
    let prevCol = this._cursor

    if (newCol < this._inputStartCursor) {
      newCol = this._inputStartCursor;
    }

    if (newCol > this._inputStartCursor + this._input.length) {
      newCol = this._inputStartCursor + this._input.length;
    }

    // Adjust horizontally
    if (newCol > prevCol) {
      for (let i = prevCol; i < newCol; ++i) this.xterm.write("\x1B[C");
    } else {
      for (let i = newCol; i < prevCol; ++i) this.xterm.write("\x1B[D");
    }

    // Set new offset
    this._cursor = newCol;
  }

  setTermSize(cols: number, rows: number) {
    this._termSize = { cols, rows };
  }

  moveCursorToEnd() {
    const end = this._inputStartCursor + this._input.length;
    this._writeCursorPosition(end);
  }

  moveCursorToStart() {
    this._writeCursorPosition(this._inputStartCursor);
  }
}

/**
 * Convert offset at the given input to col/row location
 *
 * This function is not optimized and practically emulates via brute-force
 * the navigation on the terminal, wrapping when they reach the column width.
 */
 export function offsetToColRow(input: string, offset: number, maxCols: number) {
  let row = 0;
  let col = 0;

  for (let i = 0; i < offset; ++i) {
    const chr = input.charAt(i);
    if (chr === "\n") {
      col = 0;
      row += 1;
    } else {
      col += 1;
      if (col > maxCols) {
        col = 0;
        row += 1;
      }
    }
  }

  return { row, col };
}

/**
 * Counts the lines in the given input
 */
export function countLines(input: string, maxCols: number) {
  return offsetToColRow(input, input.length, maxCols).row + 1;
}