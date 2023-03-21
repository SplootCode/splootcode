import React, { FormEvent, useEffect, useState } from 'react'

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  UseRadioProps,
  VStack,
  useRadio,
  useRadioGroup,
} from '@chakra-ui/react'
import { CheckIcon } from '@chakra-ui/icons'
import {
  ENABLE_HTTP_APPS_FLAG,
  ENABLE_STREAMLIT_APPS_FLAG,
  Project,
  ProjectLoader,
  RunType,
  loadFeatureFlags,
} from '@splootcode/core'
import { RunTypeIcon } from './run_type_icon'

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
  const [projectType, setProjectType] = useState(null as RunType | null)

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
        props.projectLoader
          .newProject(newOwner, projectID, projectTitle, 'PYTHON_CLI', projectType || RunType.COMMAND_LINE)
          .then(() => {
            onComplete(newOwner, projectID)
          })
      }
    }
  }

  const httpAppsEnable = featureFlags.get(ENABLE_HTTP_APPS_FLAG)
  const streamlitAppsEnable = featureFlags.get(ENABLE_STREAMLIT_APPS_FLAG)
  const showProjectTypeSelect = (httpAppsEnable || streamlitAppsEnable) && !clonedFrom

  let validType = true
  if (showProjectTypeSelect) {
    validType = !!projectType
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
              <FormControl isInvalid={!validID} py={2}>
                <FormLabel htmlFor="title">Title</FormLabel>
                <Input id="title" type="text" value={projectTitle} onChange={handleTitleChange} autoFocus />
                <FormHelperText>Unique project ID: {projectID}</FormHelperText>
                <FormErrorMessage>{errorMessage}</FormErrorMessage>
              </FormControl>
              {showProjectTypeSelect ? (
                <FormControl py="3">
                  <FormLabel>Project type</FormLabel>
                  <ProjectTypeRadioGroup
                    httpAppsEnable={httpAppsEnable}
                    streamlitAppsEnable={streamlitAppsEnable}
                    value={projectType}
                    onChange={setProjectType}
                  />
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

function ProjectTypeRadioOption(props: UseRadioProps & { children: React.ReactNode }) {
  const { getInputProps, getCheckboxProps } = useRadio(props)

  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label" width={'100%'}>
      <input {...input} />
      <HStack
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        justifyContent={'space-between'}
        boxShadow="md"
        _checked={{
          bg: 'blue.800',
          color: 'white',
        }}
        _focus={{
          boxShadow: 'outline',
        }}
        px={3}
        py={2}
      >
        <HStack>{props.children}</HStack>
        {props.isChecked ? <CheckIcon /> : null}
      </HStack>
    </Box>
  )
}

function ProjectTypeRadioGroup(props: {
  httpAppsEnable: boolean
  streamlitAppsEnable: boolean
  value: RunType | null
  onChange: (value: RunType | null) => void
}) {
  const { value, onChange, httpAppsEnable, streamlitAppsEnable } = props

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'project-type',
    value: value,
    onChange: onChange,
  })

  const group = getRootProps()

  return (
    <VStack {...group}>
      {streamlitAppsEnable ? (
        <ProjectTypeRadioOption key={RunType.STREAMLIT} {...getRadioProps({ value: RunType.STREAMLIT })}>
          <RunTypeIcon runType={RunType.STREAMLIT} /> <Text>Web app (Streamlit)</Text>
        </ProjectTypeRadioOption>
      ) : null}
      <ProjectTypeRadioOption key={RunType.COMMAND_LINE} {...getRadioProps({ value: RunType.COMMAND_LINE })}>
        <RunTypeIcon runType={RunType.COMMAND_LINE} /> <Text>Command line program</Text>
      </ProjectTypeRadioOption>
      {httpAppsEnable ? (
        <ProjectTypeRadioOption key={RunType.HTTP_REQUEST} {...getRadioProps({ value: RunType.HTTP_REQUEST })}>
          <RunTypeIcon runType={RunType.HTTP_REQUEST} /> <Text>Web server (Flask)</Text>
        </ProjectTypeRadioOption>
      ) : null}
      <ProjectTypeRadioOption key={RunType.SCHEDULE} {...getRadioProps({ value: RunType.SCHEDULE })}>
        <RunTypeIcon runType={RunType.SCHEDULE} /> <Text>Scheduled script</Text>
      </ProjectTypeRadioOption>
    </VStack>
  )
}
