import React, { useEffect, useState } from 'react'
import { Box, Container, Flex, HStack, Heading, Spacer, Text, VStack } from '@chakra-ui/layout'
import { Button, IconButton } from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { Link, useHistory } from 'react-router-dom'
import { MainMenuItem, MenuBar, RunTypeIcon, SaveProjectModal } from '@splootcode/components'
import { Project, ProjectLoader, ProjectMetadata, RunType, loadProjectFromFolder } from '@splootcode/core'

interface UserHomePageProps {
  projectLoader: ProjectLoader
}

const ExampleCard = (props: { linkTo: string; title: string; description: string }) => {
  const { linkTo, title, description } = props
  return (
    <Box borderWidth="1px" borderRadius="md" bg="gray.800" borderColor="gray.500">
      <Link to={linkTo}>
        <Box py={2} px={2}>
          <Heading as="h4" size="sm" pb={1}>
            {title}
          </Heading>
          <Text lineHeight={1.2} color={'gray.300'}>
            {description}
          </Text>
        </Box>
      </Link>
    </Box>
  )
}

const ProjectCard = (props: {
  ownerID: string
  projectID: string
  title: string
  description: string
  runType: RunType
  onDelete: () => void
}) => {
  const { ownerID, projectID, title, description, onDelete, runType } = props
  return (
    <Flex borderWidth="1px" borderRadius="md" bg="gray.800" borderColor="gray.500" alignItems={'center'}>
      <HStack px={2} py={1} alignItems={'center'} as={Link} to={`/p/${ownerID}/${projectID}`} flexGrow={1}>
        <RunTypeIcon runType={runType} />
        <Box py={2} px={2} flexDirection="row">
          <Heading as="h4" size="sm">
            {title}
          </Heading>
          {description ? (
            <Text lineHeight={1.2} color={'gray.300'}>
              {description}
            </Text>
          ) : null}
        </Box>
      </HStack>
      <Spacer />
      <IconButton
        size="sm"
        aria-label="Delete project"
        variant={'ghost'}
        mx={1}
        color={'gray.500'}
        icon={<DeleteIcon />}
        onClick={(event) => {
          event.stopPropagation()
          event.preventDefault()
          const result = window.confirm(`Are you sure you want to delete ${title}?`)
          if (result) {
            onDelete()
          }
          return false
        }}
      ></IconButton>
    </Flex>
  )
}

export const UserHomePage = (props: UserHomePageProps) => {
  const history = useHistory()
  const [projects, setProjects] = useState([])
  const [saveProjectModalState, setSaveProjectModalState] = useState({ open: false, clonedFrom: null })

  useEffect(() => {
    props.projectLoader.listProjectMetadata().then((projects) => {
      setProjects(projects)
    })
  }, [])

  const newProject = (clonedFrom?: Project) => {
    setSaveProjectModalState({
      open: true,
      clonedFrom: clonedFrom || null,
    })
  }

  const menuItems: MainMenuItem[] = [
    {
      name: 'New Project',
      onClick: () => {
        newProject()
      },
    },
    {
      name: 'Import Project',
      onClick: async () => {
        const dirHandle = await window.showDirectoryPicker()
        const proj = await loadProjectFromFolder(dirHandle)
        setSaveProjectModalState({ open: true, clonedFrom: proj })
      },
    },
  ]
  return (
    <React.Fragment>
      <SaveProjectModal
        clonedFrom={saveProjectModalState.clonedFrom}
        newOwner="local"
        isOpen={saveProjectModalState.open}
        projectLoader={props.projectLoader}
        onClose={() => setSaveProjectModalState({ open: false, clonedFrom: null })}
        onComplete={(owner, projectID) => {
          setSaveProjectModalState({ open: false, clonedFrom: null })
          history.push(`/p/${owner}/${projectID}`)
        }}
      />
      <MenuBar menuItems={menuItems}></MenuBar>
      <Container maxW="container.md" paddingTop={8}>
        <VStack align="stretch" spacing={10}>
          <Box>
            <Flex justifyContent="space-between" marginBottom={2} alignItems="flex-end">
              <Heading as="h2" size="md" fontSize={'20pt'} py={2}>
                My projects
              </Heading>
              <Button size="lg" colorScheme="purple" height={8} my={2} onClick={() => newProject()}>
                New Project
              </Button>
            </Flex>
            <VStack align="stretch" gridGap={1}>
              {projects.length === 0 ? (
                <Box borderRadius="md" bg="gray.800" p="2">
                  You do not have any projects yet.
                </Box>
              ) : null}
              {projects.map((projectMeta: ProjectMetadata) => {
                return (
                  <ProjectCard
                    key={projectMeta.id}
                    ownerID={projectMeta.owner}
                    projectID={projectMeta.id}
                    title={projectMeta.title}
                    description={''}
                    runType={projectMeta.runType}
                    onDelete={() => {
                      props.projectLoader.deleteProject(projectMeta.owner, projectMeta.id).then(() => {
                        props.projectLoader.listProjectMetadata().then((projects) => {
                          setProjects(projects)
                        })
                      })
                    }}
                  />
                )
              })}
            </VStack>
          </Box>
          <HStack gridGap={3} alignItems="flex-start">
            <VStack align="stretch" flex={1} gridGap={1}>
              <Heading as="h2" size="lg" fontSize={'20pt'}>
                Examples
              </Heading>
              <ExampleCard
                linkTo="/p/examples/helloname"
                title="Hello Name"
                description="First program for beginners to start with variables and console input."
              />
              <ExampleCard
                linkTo="/p/examples/temperature_conversion"
                title="Temperature Conversion"
                description="Convert temperatures in Fahrenheit to Celsius."
              />
              <ExampleCard
                linkTo="/p/examples/secret_password"
                title="Secret password"
                description="Guess the password and learn about Python while-loops."
              />
            </VStack>
          </HStack>
        </VStack>
      </Container>
    </React.Fragment>
  )
}
