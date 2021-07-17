import React, { useState } from 'react';

import { Box, Button, Grid, Heading, Image, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, TagLabel, Text, useDisclosure, useRadio, useRadioGroup } from "@chakra-ui/react"
import { Project } from '../language/projects/project';
import { loadExampleProject, loadProject } from '../code_io/project_loader';


function RadioCard(props) {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderColor="gray.500"
        borderRadius="md"
        boxShadow="md"
        textAlign="center"
        minHeight="12"
        _checked={{
          bg: "gray.600",
          borderWidth: 1,
          borderColor: "blue.200",
        }}
        overflow="hidden"
      >
        {props.children}
      </Box>
    </Box>
  )
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadProjectIntoEditor: (proj: Project) => void;
}

export function NewProjectModal(props: NewProjectModalProps) {
  let { isOpen, onClose, loadProjectIntoEditor } = props;
  let [selectedProject, setSelectedProject] = useState('');

  const handleLoad = async (event) => {
    let proj = null;
    switch (selectedProject) {
      case 'website':
        proj = await loadExampleProject('blank')
        break;
      case 'python':
        proj = await loadExampleProject('blankpython')
        break;
    }
    loadProjectIntoEditor(proj);
    onClose();
  };

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "selection",
    defaultValue: "",
    onChange: (value) => {
      setSelectedProject(value.toString());
    },
  })

  const group = getRootProps();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size='xl'>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>New Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody {...group}>
            <Text size="sm" pb={2}>What kind of project is this?</Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "website"})}>
                <Heading size="sm" my={3}>Website<br/>(HTML/CSS/JS)</Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "python"})}>
                <Heading size="sm" my={3}>Command line<br/>(Python)</Heading>
              </RadioCard>
            </Grid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" disabled={selectedProject === ''} onClick={handleLoad}>Create project</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}