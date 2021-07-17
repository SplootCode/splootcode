import React, { MouseEvent } from 'react'
import { Component } from 'react'
import { observer } from 'mobx-react';

import { Box, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Stack, Menu, MenuButton, Button, MenuList, MenuItem, Icon, Spacer, Flex, IconButton } from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";

import { EditorStateContext, EditorState, DataSheetState } from '../context/editor_context';
import { NodeBlock } from '../layout/rendered_node';
import { loadTypes } from '../language/type_loader';
import { Project, ProjectLayoutType } from '../language/projects/project';
import { loadExampleProject, loadProject, saveProject } from '../code_io/project_loader';
import { SplootFile } from '../language/projects/file';
import { SplootPackage } from '../language/projects/package';
import { LoadProjectModal } from '../components/load_modal';
import { RiFileAddLine } from "react-icons/ri";


import './pageeditor.css';
import { NewFileModal } from '../components/new_file_modal';
import { SplootNode } from '../language/node';
import { DATA_SHEET, SplootDataSheet } from '../language/types/dataset/datasheet';
import { WebEditorPanels } from './web_editor';
import { PythonEditorPanels } from './python_editor';
import { NewProjectModal } from '../components/new_project_modal';

interface PageEditorProps {
};

interface PageEditorState {
  openLoadProjectModal: boolean;
  openNewProjectModal: boolean;
  openNewFileModal: boolean;
  newFilePackageName: string;
  ready: boolean;
  isNodeEditor: boolean;
  selectedFile: EditorState;
  selectedDatasheet: DataSheetState;
  project: Project;
};

class PageEditorInternal extends Component<PageEditorProps, PageEditorState> {
  static contextType = EditorStateContext;

  constructor(props : PageEditorProps) {
      super(props);

      this.state = {
        openLoadProjectModal: true,
        openNewProjectModal: false,
        openNewFileModal: false,
        newFilePackageName: '',
        ready: false,
        isNodeEditor: true,
        selectedFile: null,
        selectedDatasheet: null,
        project: null,
      };
  }

  componentDidMount() {
    loadTypes();

    loadExampleProject('blank').then((project) => {
      this.setState({
        project: project,
        selectedFile: null,
        ready: true,
      });
    });
  }

  loadProjectIntoEditor = (project: Project) => {
    this.setState({
      project: project,
      selectedFile: null,
      ready: true,
    });
  }

  openLoadProjectModal = (event) => {
    this.setState({
      openLoadProjectModal: true,
    })
  }

  openNewProjectModal = (event) => {
    this.setState({
      openNewProjectModal: true,
    })
  }


  newFileModal(packageName: string) {
    return (event : MouseEvent) => {
      event.stopPropagation();
      this.setState({
        newFilePackageName: packageName,
        openNewFileModal: true,
      });
    }
  }

  render() {
    let {ready, selectedFile, selectedDatasheet, project, isNodeEditor, openLoadProjectModal, openNewProjectModal, openNewFileModal} = this.state;

    if (!ready) {
      return null;
    }

    let onlyPackage : SplootPackage = project.packages[0];

    return (
      <div className={ project.layoutType === ProjectLayoutType.WEB ? "web-editor-container" : "python-editor-container"}>
        <LoadProjectModal isOpen={openLoadProjectModal} onClose={() => {
          this.setState({openLoadProjectModal: false});
        }} loadProjectIntoEditor={this.loadProjectIntoEditor}/>
        <NewProjectModal isOpen={openNewProjectModal} onClose={() => {
          this.setState({openNewProjectModal: false});
        }} loadProjectIntoEditor={this.loadProjectIntoEditor}/>
        <NewFileModal isOpen={openNewFileModal} onClose={() => {
          this.setState({openNewFileModal: false, newFilePackageName: ''});
        }} addCodeFile={
          (name: string, type: string, rootNode: SplootNode) => {
            onlyPackage.addFile(name, type, rootNode);
          }
        }/>
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
              <MenuItem onClick={this.openLoadProjectModal}>Load Example</MenuItem>
              <MenuItem onClick={this.openNewProjectModal}>New Project</MenuItem>
              <MenuItem onClick={async (event) => {
                 const dirHandle = await window.showDirectoryPicker();
                 let proj = await loadProject(dirHandle);
                 this.loadProjectIntoEditor(proj);
              }}>Open Project from Folder</MenuItem>
              <MenuItem onClick={async (event) => {
                const dirHandle = await window.showDirectoryPicker();
                await saveProject(dirHandle, project);
              }}
              >Save Project As...</MenuItem>
            </MenuList>
          </Menu>
          <Accordion allowMultiple={true} defaultIndex={[0, 1, 2, 3]}>
            <AccordionItem>
              <AccordionButton p={2} fontSize="sm">
                <AccordionIcon/>
                <Flex textAlign="left" justifyContent="space-between" mx={1} width="100%" alignItems="center">
                  <Box>{onlyPackage.name}</Box><IconButton onClick={this.newFileModal(onlyPackage.name)} aria-label="New file" size="sm" variant="ghost" icon={<Icon as={RiFileAddLine}/>} />
                </Flex>
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
        { project.layoutType === ProjectLayoutType.PYTHON_CLI ? 
          <PythonEditorPanels project={project} selectedFile={selectedFile}  />
          :
          <WebEditorPanels isNodeEditor={isNodeEditor} project={project} selectedDatasheet={selectedDatasheet} selectedFile={selectedFile} />
        }
      </div>
    )
  }

  selectFile(selectedPackage: SplootPackage, file: SplootFile) {
    let loadEditor = (file: SplootFile) => {
      if (file.type === DATA_SHEET) {
        let dataSheetState = new DataSheetState();
        dataSheetState.setDataSheetNode(file.rootNode as SplootDataSheet);
        this.setState({selectedDatasheet: dataSheetState, isNodeEditor: false});
      } else {
        let editorState = new EditorState();
        let newRootNode = new NodeBlock(null, file.rootNode, editorState.selection, 0, false);
        editorState.selection.setRootNode(newRootNode);
        editorState.setRootNode(newRootNode);
        this.setState({selectedFile: editorState, isNodeEditor: true});
      }
    };
    if (!file.isLoaded) {
      selectedPackage.getLoadedFile(file.name).then(loadEditor)
    } else {
      loadEditor(file);
    }
  }
}

export const PageEditor = observer(PageEditorInternal);
