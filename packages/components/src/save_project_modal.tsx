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
import { Project, ProjectLoader } from '@splootcode/core'

function convertToURL(title: string) {
  return title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}

interface SaveProjectModalProps {
  isOpen: boolean
  newOwner: string
  clonedFrom?: Project
  onClose: () => void
  onComplete: (projectID: string, title: string) => void
  projectLoader: ProjectLoader
}

export function SaveProjectModal(props: SaveProjectModalProps) {
  const { isOpen, onClose, onComplete, newOwner, projectLoader, clonedFrom } = props
  const [projectID, setProjectID] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [validID, setValidID] = useState(true)

  useEffect(() => {
    if (clonedFrom) {
      const generate = async () => {
        const [name, title] = await projectLoader.generateValidProjectId(newOwner, clonedFrom.name, clonedFrom.title)
        setProjectID(name)
        setProjectTitle(title)
      }
      generate()
    } else {
      setProjectID('')
      setProjectTitle('')
    }
  }, [clonedFrom])

  useEffect(() => {
    projectLoader.isValidProjectId(newOwner, projectID).then((isValid) => {
      setValidID(isValid)
    })
  }, [projectID])

  const handleCreate = () => {
    onComplete(projectID, projectTitle)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectTitle(e.target.value)
    setProjectID(convertToURL(e.target.value))
  }

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
          <ModalHeader>{clonedFrom ? 'Save as new project' : 'New Project'}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <FormControl isInvalid={!validID}>
                <FormLabel htmlFor="title">Project Title</FormLabel>
                <Input id="title" type="text" value={projectTitle} onChange={handleTitleChange} autoFocus />
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
