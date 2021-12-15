import React, { ReactNode, useState } from 'react'

import {
  Box,
  Button,
  Grid,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { UseRadioProps, useRadio, useRadioGroup } from '@chakra-ui/radio'
import { Project } from '@splootcode/core/language/projects/project'
import { loadExampleProject, loadProject } from '../code_io/project_loader'

function RadioCard(props: UseRadioProps & { children: ReactNode }) {
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
          bg: 'gray.600',
          borderWidth: 1,
          borderColor: 'blue.200',
        }}
        overflow="hidden"
      >
        {props.children}
      </Box>
    </Box>
  )
}

interface LoadProjectModalProps {
  isOpen: boolean
  onClose: () => void
  loadProjectIntoEditor: (proj: Project) => void
}

export function LoadProjectModal(props: LoadProjectModalProps) {
  const { isOpen, onClose, loadProjectIntoEditor } = props
  const [selectedProject, setSelectedProject] = useState('')

  const handleLoad = async (event) => {
    let proj = null
    switch (selectedProject) {
      case 'bouncing':
      case 'flashcards':
      case 'gallery':
      case 'helloworld':
        proj = await loadExampleProject(selectedProject)
        break
      case 'blank':
        proj = await loadExampleProject('blank')
        break
      case 'files':
        const dirHandle = await window.showDirectoryPicker()
        proj = await loadProject(dirHandle)
        break
    }
    loadProjectIntoEditor(proj)
    onClose()
  }

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'selection',
    defaultValue: '',
    onChange: (value) => {
      setSelectedProject(value.toString())
    },
  })

  const group = getRootProps()

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Load Example Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody {...group}>
            <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({ value: 'helloworld' })}>
                <Heading size="sm" my={3}>
                  Hello World <br />
                  (Python CLI)
                </Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({ value: 'bouncing' })}>
                <Heading size="sm" my={3}>
                  Bouncing balls (HTML Canvas)
                </Heading>
              </RadioCard>
              {/* 
                // @ts-ignore */}
              <RadioCard {...getRadioProps({ value: 'gallery' })}>
                <Heading size="sm" my={3}>
                  Photo Gallery
                  <br />
                  (React)
                </Heading>
              </RadioCard>
            </Grid>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" disabled={selectedProject === ''} onClick={handleLoad}>
              Load Project
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
