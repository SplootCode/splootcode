import React from 'react'
import { Component } from 'react'

import { Box, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Stack, Menu, MenuButton, Button, MenuList, MenuItem } from "@chakra-ui/react";
import { ChevronDownIcon, HamburgerIcon } from "@chakra-ui/icons";

import './pageeditor.css';
import { Editor } from '../components/editor/editor';
import { Panel } from '../components/panel';
import { EditorStateContext, EditorState } from '../context/editor_context';
import { observer } from 'mobx-react';

import { NodeBlock } from '../layout/rendered_node';
import { loadTypes } from '../language/type_loader';
import { Project } from '../language/projects/project';
import { loadExampleProject, loadProject, saveProject } from '../code_io/project_loader';
import { SplootFile } from '../language/projects/file';
import { SplootPackage } from '../language/projects/package';
import { ViewPage } from '../components/preview/frame_view';


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

    loadExampleProject('bouncyexample').then((project) => {
      this.setState({
        project: project,
        selectedFile: null,
        ready: true,
      });
    });
  }

  render() {
    let {ready, selectedFile, project} = this.state;

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
              <MenuItem onClick={async (event) => {
                const dirHandle = await window.showDirectoryPicker();
                let proj = await loadProject(dirHandle);
                this.setState({
                  project: proj,
                  selectedFile: null,
                  ready: true,
                });
              }}
              >Load Project</MenuItem>
              <MenuItem onClick={async (event) => {
                const dirHandle = await window.showDirectoryPicker();
                await saveProject(dirHandle, project);
              }}
              >Save</MenuItem>
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
