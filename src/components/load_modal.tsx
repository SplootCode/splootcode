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

interface LoadProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadProjectIntoEditor: (proj: Project) => void;
}

export function LoadProjectModal(props: LoadProjectModalProps) {
  let { isOpen, onClose, loadProjectIntoEditor } = props;
  let [selectedProject, setSelectedProject] = useState('');

  const handleLoad = async (event) => {
    let proj = null;
    switch (selectedProject) {
      case 'bouncing':
      case 'flashcards':
      case 'gallery':
        proj = await loadExampleProject(selectedProject)
        break;
      case 'blank':
      case 'gallery':
        proj = await loadExampleProject('blank')
        break;
      case 'files':
        const dirHandle = await window.showDirectoryPicker();
        proj = await loadProject(dirHandle);
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
          <ModalHeader>Select Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody {...group}>
            <Text size="sm" pb={2}>Select an example:</Text>
            <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "bouncing"})}>
                <Image src="https://placekitten.com/200/140" alt="kitten"/>
                <Heading size="sm" my={3}>Bouncing balls (HTML Canvas)</Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "gallery"})}>
                <Image src="https://placekitten.com/200/140" alt="kitten"/>
                <Heading size="sm" my={3}>Photo Gallery<br/>(coming soon)</Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "flashcards"})}>
                <Image src="https://placekitten.com/200/140" alt="kitten"/>
                <Heading size="sm" my={3}>Flash Cards <br/>(coming soon)</Heading>
              </RadioCard>
            </Grid>
            <Text size="sm" pb={2}>Or start with...</Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "blank"})}>
                <Heading size="sm" my={3}> Blank project</Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({value: "files"})}>
                <Heading size="sm" mt={1}>Files on my computer</Heading>
                <Text size="xs">(Chrome only)</Text>
              </RadioCard>
            </Grid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" disabled={selectedProject === ''} onClick={handleLoad}>Load Project</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}