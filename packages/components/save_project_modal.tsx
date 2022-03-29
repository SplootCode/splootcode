import React, { FormEvent, useEffect, useState } from 'react'

import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { Project } from '@splootcode/core/language/projects/project'
import { ProjectLoader } from '@splootcode/core/language/projects/file_loader'

function convertToURL(title: string) {
  return title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}

interface NewProjectModalProps {
  isOpen: boolean
  clonedFrom?: Project
  onClose: () => void
  onComplete: (projectID: string, title: string) => void
  projectLoader: ProjectLoader
}

export function SaveProjectModal(props: NewProjectModalProps) {
  const { isOpen, onClose, onComplete, projectLoader, clonedFrom } = props
  const [projectID, setProjectID] = useState('')
  const [projectTitle, setProjectTitle] = useState('')

  useEffect(() => {
    if (clonedFrom) {
      setProjectID(clonedFrom.name)
      setProjectTitle(clonedFrom.title)
    } else {
      setProjectID('')
      setProjectTitle('')
    }
  }, [clonedFrom])

  const handleCreate = () => {
    onComplete(projectID, projectTitle)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectTitle(e.target.value)
    setProjectID(convertToURL(e.target.value))
  }

  const validID = projectLoader.isValidProjectId(projectID)
  let errorMessage = ''
  if (!validID && projectID !== '') {
    errorMessage = 'This project ID is already taken'
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (projectTitle !== '' && validID) {
      onComplete(projectID, projectTitle)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>New Project</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <FormControl isInvalid={!validID}>
                <FormLabel htmlFor="title">Project Title</FormLabel>
                <Input id="title" type="text" value={projectTitle} onChange={handleTitleChange} />
                <FormHelperText>Unique project ID: {projectID}</FormHelperText>
                <FormErrorMessage>{errorMessage}</FormErrorMessage>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" disabled={projectTitle === '' || !validID} onClick={handleCreate}>
                Create project
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  )
}
