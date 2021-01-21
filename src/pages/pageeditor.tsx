import React from 'react'
import { Component } from 'react'

import './pageeditor.css';
import { Editor } from '../components/editor/editor';
import { Panel } from '../components/panel';
import { EditorStateContext, EditorState } from '../context/editor_context';
import { observer } from 'mobx-react';

import { parseHtml } from '../code_io/import_html';
import { NodeBlock } from '../layout/rendered_node';
import { parseJs } from '../code_io/import_js';
import { loadTypes } from '../language/type_loader';
import { CommandlinePage } from '../components/commandline/commandline';
import { generateScope } from "../language/scope/scope";
import { SplootNode } from '../language/node';
import { JAVASCRIPT_FILE } from '../language/types/file';
import { HTML_DOCUMENT } from '../language/types/html_document';
import { ViewPage } from '../components/preview/frame_view';


const StartingDocuments = [
  {
    filename: 'blank.html',
    contents: `
    `
  },  
  {
  filename: 'index.html',
  contents: `
<!DOCTYPE html>
<html>
<head>
  <title>Sploooooot</title>
  <script crossorigin src="https://unpkg.com/react@17/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
</head>
<body>
  <p class="special">Why, hello there.<br>How are you?</p>
  <div class="container" onClick="doSomething()">
    <button>Click Me</button>
  </div>
  <div id="root"></div>
  <script>
  function load() {
    let x = 3 + 5 / 100 * 8;
    ReactDOM.render(
      React.createElement('div', null, 'Hello World'),
      document.getElementById('root')
    );
  }
  window.onload = load;
  </script>
</body>
</html>
   `
},
{
  filename: 'bouncy.html',
  contents: `
<!DOCTYPE html>
<html>
<head>
  <title>Bouncy ball</title>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
  let context = null;
  let ballX = 50;
  let ballY = 70;
  let ballVelocityX = -5;
  let ballVelocityY = 0;

  function updatePosition() {
    ballY = ballY + ballVelocityY;
    ballX = ballX + ballVelocityX;
    if (ballY + 10 >= window.innerHeight) {
      ballVelocityY = -1 * ballVelocityY;
    }
    if (ballY + 20 < window.innerHeight) {
      ballVelocityY = ballVelocityY + 1;
    }
    if(ballX + 20 > window.innerWidth || ballX - 20 < 0){
      ballVelocityX = -1 * ballVelocityX;
    }
  }

  function draw(timestamp) {
    updatePosition();
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    window.requestAnimationFrame(draw);
    context.beginPath();
    context.arc(ballX, ballY, 20, 0, 2 * Math.PI);
    context.fillStyle = 'rgb(0, 0, 200)';
    context.fill();
  }

  function load() {
    let canvas = document.getElementById('canvas');
    context = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.requestAnimationFrame(draw);
  }
  window.onload = load;
  </script>
</body>
</html>
   `
},
{
  filename: 'app.js',
  contents: `
async function main() {
  console.log('Hello world!');
  setTimeout(function() {console.log("Time's up!")}, 2000);
  console.log("test" + " something".toUpperCase(), 3 + 100 * 10, null);
  let x = await prompt('Enter a thing: ');
  console.log('You entered "' + x + '"');
  x = parseInt(x);
  if (x > 100) {
    console.log('That\\\'s over a hundred!');
  }
  if (x === 100) {
    console.log('That\\\'s a hundred!');
  }
  if (x < 100) {
    console.log('That\\\'s not even a hundred!');
  }
  document.getElementById('id').value;
  document.thing.foo.bar.whatever.value;
}
main();
`
}] as {filename, contents}[];

async function loadDocument(filename: string, contents: string): Promise<EditorState> {
  let rootNode : SplootNode = null;
  if (filename.endsWith('.html') || filename.endsWith('.htm')) {
    rootNode = parseHtml(contents);
  } else if (filename.endsWith('.js')) {
    rootNode = parseJs(contents);
  }
  await generateScope(rootNode);
  let editorState = new EditorState();
  // Each node needs a ref to the selection and the selection needs access to the nodes.
  let newRootNode = new NodeBlock(null, rootNode, editorState.selection, 0, false);
  editorState.selection.setRootNode(newRootNode);
  editorState.setRootNode(newRootNode);

  return editorState;
}

interface PageEditorProps {
};

interface PageEditorState {
  ready: boolean;
  selectedFile: string;
  editors: { [key: string]: EditorState };
  editorOrder: string[];
};

class PageEditorInternal extends Component<PageEditorProps, PageEditorState, EditorState> {
  static contextType = EditorStateContext;

  constructor(props : PageEditorProps) {
      super(props);

      let editorOrder = [];
      StartingDocuments.forEach((documentInfo) => {
        editorOrder.push(documentInfo.filename);
      })

      this.state = {
        ready: false,
        selectedFile: 'blank.html',
        editors: {},
        editorOrder: editorOrder,
      };
  }

  componentDidMount() {
    loadTypes();

    let editorOrder = [];

    Promise.all(StartingDocuments.map((documentInfo) => {
      editorOrder.push(documentInfo.filename);
      return loadDocument(documentInfo.filename, documentInfo.contents);
    })).then(editorStates => {
      let editors = {};
      editorOrder.forEach((filename, index) => {
        editors[filename] = editorStates[index];
      })
      this.setState({
        ready: true,
        selectedFile: 'blank.html',
        editorOrder: editorOrder,
        editors: editors,
      })
    })
  }

  render() {
    let {ready, selectedFile, editorOrder, editors} = this.state;
    let rootNode : SplootNode = null;
    let viewComponent = null;
    if (ready) {
      rootNode = editors[selectedFile].rootNode.node;
      if (rootNode.type === JAVASCRIPT_FILE) {
        viewComponent = <CommandlinePage rootNode={rootNode} />;
      } else if (rootNode.type === HTML_DOCUMENT) {
        viewComponent = <ViewPage rootNode={rootNode} />;
      }
    }

    return (
      <div className="page-editor-container">
        <nav className="left-panel">
          <ul className="file-nav-list">
            {
              editorOrder.map((filename: string) => {
                return <li className={ selectedFile === filename ? 'selected' : ''} onClick={() => { this.setState({selectedFile: filename})}}>{ filename }</li>
              })
            }
          </ul>
        </nav>
        <div className="page-editor-column">
          {
            editorOrder.map((filename: string) => {
              let editor = editors[filename];
              if (!!!editor) {
                return null;
              }
              return (
                <EditorStateContext.Provider value={editor}>
                  <div className={'editor-panel' + (selectedFile === filename ? ' selected' : '')}>
                    <Panel selection={editor.selection}/>
                    <Editor block={editor.rootNode} selection={editor.selection} width={300} />
                  </div>
                </EditorStateContext.Provider>
              );
            })
          }
        </div>
        <div className={'page-editor-preview-panel'} >
          { ready ? viewComponent : null }
        </div>
      </div>
    )
  }
}

export const PageEditor = observer(PageEditorInternal);
