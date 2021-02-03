import React from 'react'
import { Component } from 'react'

import { Box, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Stack, Menu, MenuButton, Button, MenuList, MenuItem } from "@chakra-ui/react";
import { ChevronDownIcon, HamburgerIcon } from "@chakra-ui/icons";


import './pageeditor.css';
import { Editor } from '../components/editor/editor';
import { Panel } from '../components/panel';
import { EditorStateContext, EditorState } from '../context/editor_context';
import { observer } from 'mobx-react';

import { parseHtml } from '../code_io/import_html';
import { NodeBlock } from '../layout/rendered_node';
import { parseJs } from '../code_io/import_js';
import { loadTypes } from '../language/type_loader';
import { generateScope } from "../language/scope/scope";
import { SplootNode } from '../language/node';
import { Project } from '../language/projects/project';
import { loadProject } from '../code_io/project_loader';
import { SplootFile } from '../language/projects/file';
import { SplootPackage } from '../language/projects/package';
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

interface PageEditorProps {
};

interface PageEditorState {
  ready: boolean;
  selectedFile: EditorState;
  project: Project;
};

class PageEditorInternal extends Component<PageEditorProps, PageEditorState, EditorState> {
  static contextType = EditorStateContext;

  constructor(props : PageEditorProps) {
      super(props);

      this.state = {
        ready: false,
        selectedFile: null,
        project: null,
      };
  }

  componentDidMount() {
    loadTypes();

    loadProject('bouncyexample').then((project) => {
      this.setState({
        project: project,
        selectedFile: null,
        ready: true,
      });
    });
  }

  render() {
    let {ready, selectedFile, project} = this.state;
    let rootNode : SplootNode = null;
    let viewComponent = null;

    if (!ready) {
      return null;
    }

    let onlyPackage : SplootPackage = project.packages[0];
    return (
      <div className="page-editor-container">
        <nav className="left-panel">
          <Menu>
            <MenuButton
              aria-label="Project Options"
              as={Button}
              rightIcon={<HamburgerIcon />}
              variant="ghost"
              borderRadius={0}
              textAlign="left"
              justifyContent="left"
              fontSize="sm"
              w="100%"
              px={3}
            >
                Project
            </MenuButton>
            <MenuList>
              <MenuItem>New Project</MenuItem>
              <MenuItem>Open Project</MenuItem>
              <MenuItem>Save</MenuItem>
            </MenuList>
          </Menu>
          <Accordion allowMultiple={true} defaultIndex={[0, 1, 2, 3]}>
            <AccordionItem>
              <AccordionButton p={2} fontSize="sm">
                <AccordionIcon/>
                <Box flex="1" textAlign="left" mx={1}>
                  Main
                </Box>
              </AccordionButton>
              <AccordionPanel px={0} paddingBottom={3} paddingTop={0}>
                <Stack spacing={0.5}>
                  {
                    onlyPackage.fileOrder.map((filename: string) => {
                      let splootFile = onlyPackage.files[filename];
                      return <Button
                        borderRadius={0}
                        paddingLeft={7}
                        variant="ghost"
                        justifyContent="left"
                        fontWeight="normal"
                        textAlign="left"
                        size="sm"
                        color="whiteAlpha.700"
                        height={6}
                        isActive={false} // todo
                        onClick={() => { this.selectFile(onlyPackage, splootFile) }}>
                          { filename }
                      </Button>
                    })
                  }
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </nav>
        <div className="page-editor-column">
          {
            (ready && selectedFile) ?
                <EditorStateContext.Provider value={selectedFile}>
                  <div className={'editor-panel selected'}>
                    <Panel selection={selectedFile.selection}/>
                    <Editor block={selectedFile.rootNode} selection={selectedFile.selection} width={300} />
                  </div>
                </EditorStateContext.Provider>
            : null
          }
        </div>
        <div className={'page-editor-preview-panel'} >
          { ready ? <ViewPage pkg={onlyPackage}/> : null }
        </div>
      </div>
    )
  }

  selectFile(selectedPackage: SplootPackage, file: SplootFile) {
    if (!file.isLoaded) {
      selectedPackage.getLoadedFile(file.name).then((file: SplootFile) => {
        let editorState = new EditorState();
        let newRootNode = new NodeBlock(null, file.rootNode, editorState.selection, 0, false);
        editorState.selection.setRootNode(newRootNode);
        editorState.setRootNode(newRootNode);
        this.setState({selectedFile: editorState});
      })
    } else {
      let editorState = new EditorState();
        let newRootNode = new NodeBlock(null, file.rootNode, editorState.selection, 0, false);
        editorState.selection.setRootNode(newRootNode);
        editorState.setRootNode(newRootNode);
        this.setState({selectedFile: editorState});
    }
  }
}

export const PageEditor = observer(PageEditorInternal);
