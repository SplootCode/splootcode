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
  Select,
} from '@chakra-ui/react'
import { ENABLE_HTTP_APPS_FLAG, loadFeatureFlags } from '@splootcode/editor'
import { Project, ProjectLoader, RunType } from '@splootcode/core'

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
  onComplete: (ownerID: string, projectID: string) => void
  projectLoader?: ProjectLoader
}

export function SaveProjectModal(props: SaveProjectModalProps) {
  const { isOpen, onClose, onComplete, newOwner, projectLoader, clonedFrom } = props
  const [projectID, setProjectID] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [validID, setValidID] = useState(true)
  const [projectType, setProjectType] = useState('')

  const featureFlags = loadFeatureFlags()

  useEffect(() => {
    if (clonedFrom && projectLoader) {
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
  }, [clonedFrom, projectLoader])

  useEffect(() => {
    if (projectID === '') {
      return
    }

    projectLoader.isValidProjectId(newOwner, projectID).then((isValid) => {
      setValidID(isValid)
    })
  }, [projectID])

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
      if (props.clonedFrom) {
        const proj = props.clonedFrom
        props.projectLoader.cloneProject(newOwner, projectID, projectTitle, proj).then((newProj) => {
          onComplete(newOwner, projectID)
        })
      } else {
        let runType = RunType.COMMAND_LINE
        if (httpsAppsEnable) {
          runType = projectType as RunType
        }

        props.projectLoader.newProject(newOwner, projectID, projectTitle, 'PYTHON_CLI', runType).then(() => {
          onComplete(newOwner, projectID)
        })
      }
    }
  }

  const httpsAppsEnable = featureFlags.get(ENABLE_HTTP_APPS_FLAG)

  let validType = true
  if (httpsAppsEnable) {
    validType = projectType === RunType.COMMAND_LINE || projectType === RunType.HTTP_REQUEST
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

              {httpsAppsEnable && !clonedFrom ? (
                <FormControl mt="4">
                  <FormLabel>Project type</FormLabel>

                  <Select
                    placeholder="Choose a project type"
                    onChange={(ev) => setProjectType(ev.target.value)}
                    value={projectType}
                  >
                    <option value={RunType.COMMAND_LINE}>Script app</option>
                    <option value={RunType.HTTP_REQUEST}>Webhook app</option>
                  </Select>
                </FormControl>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <Button
                colorScheme="blue"
                disabled={projectTitle === '' || projectID === '' || !validID || !validType}
                type="submit"
              >
                Create project
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  )
}
