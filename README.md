# SplootCode Editor
An experimental coding interface that's tree-based.

![example program](screenshot1.png | width=160)

With a regular text-based programming language, the first step to process it is to parse it into an abstract-syntax-tree.
One stray quote mark can often break the parse tree for the whole document, making it difficult for IDEs to keep up with edits.
In the SplootCode editor, the user edits the tree directly and the tree can include more semantic meaning.

That being said, building a tree-editing interface that's fast, compact and intuitive is no easy feat. This is very much a work in progress.

## Goals
 * Help developers avoid syntax errors and other common programming error
 * Avoid busywork like escaping, style rules and whitespace
 * Let beginners focus on the logic of their code rather than the syntax
 * Unrestricted development, no need to switch to text code at any time
 * Fast and easy to edit using a keyboard and autocomplete

## Development
### Requirements
You'll need to have [nodejs](https://nodejs.org/) and [yarn](https://yarnpkg.com/) installed.

### Local Dev Server
Local dev is set up using webpack-dev-server which includes hot reloading.

Install dependencies:
```$ yarn install```

Generate type information for built-in Javascript variables and functions.
```$ yarn generate-types```

The editor includes an iframe which executes the code as a preview.
You will need to run the webpack devserver for both the main app and the frame.
```$ yarn start```

And in a separate terminal:
```$ yarn start-frame```

## License
If you're planning to use this for commercial purposes, please check the [LICENSE](LICENSE) file. It is not a standard open source license.
