import React, { useEffect, useState } from 'react'
import { Box, Container, Flex, Grid, Heading, Spacer, VStack } from '@chakra-ui/layout'
import { Button, IconButton } from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { Link, useHistory } from 'react-router-dom'
import { MainMenuItem, MenuBar } from '@splootcode/components/menu_bar'
import { ProjectLoader } from '@splootcode/core/language/projects/file_loader'
import { loadProjectFromFolder } from '@splootcode/core/code_io/filesystem'

interface UserHomePageProps {
  projectLoader: ProjectLoader
}

export const UserHomePage = (props: UserHomePageProps) => {
  const history = useHistory()
  const [projects, setProjects] = useState([])

  useEffect(() => {
    setProjects(props.projectLoader.listProjectMetadata())
  }, [])

  const newProject = () => {
    const title = prompt('Enter title for new project: ')
    props.projectLoader.newProject(title, title).then((proj) => {
      history.push(`/p/local/${title}`)
    })
  }

  const menuItems: MainMenuItem[] = [
    {
      name: 'New Project',
      onClick: newProject,
    },
    {
      name: 'Import Project',
      onClick: async () => {
        const dirHandle = await window.showDirectoryPicker()
        const proj = await loadProjectFromFolder(dirHandle)
        const isValid = props.projectLoader.isValidProjectId(proj.name)
        let newName = proj.name
        if (!isValid) {
          newName = prompt('Project ID already exists or is invalid. Please enter a new name:')
        }
        props.projectLoader.cloneProject(newName, proj).then((newProj) => {
          setProjects(props.projectLoader.listProjectMetadata())
        })
      },
    },
  ]
  return (
    <React.Fragment>
      <MenuBar menuItems={menuItems}></MenuBar>
      <Container maxW="container.md" paddingTop={8}>
        <VStack align="stretch" spacing={8}>
          <Box>
            <Heading as="h2" size="md" marginBottom={2}>
              Examples
            </Heading>
            <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
              <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                <Link to="/p/examples/helloname">
                  <Box p="6">Hello Name</Box>
                </Link>
              </Box>
              <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                <Link to="/p/examples/temperature_conversion">
                  <Box p="6">Temperature Conversion</Box>
                </Link>
              </Box>
              <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                <Link to="/p/examples/secret_password">
                  <Box p="6">Secret password</Box>
                </Link>
              </Box>
            </Grid>
          </Box>
          <Box>
            <Flex justifyContent="space-between" marginBottom={2} alignItems="flex-end">
              <Heading as="h2" size="md">
                Your projects
              </Heading>
              <Button size="sm" colorScheme="blue" onClick={newProject}>
                New Project
              </Button>
            </Flex>
            <VStack align="stretch">
              {projects.length === 0 ? (
                <Box borderRadius="md" bg="gray.700" p="2">
                  You do not have any projects yet.
                </Box>
              ) : null}
              {projects.map((projectMeta) => {
                return (
                  <Link key={projectMeta.id} to={`/p/local/${projectMeta.id}`}>
                    <Flex borderRadius="md" bg="gray.700" p="2" alignItems={'center'}>
                      {projectMeta.title}
                      <Spacer />
                      <IconButton
                        size="sm"
                        aria-label="Delete project"
                        icon={<DeleteIcon />}
                        onClick={(event) => {
                          event.stopPropagation()
                          event.preventDefault()
                          const result = window.confirm(`Are you sure you want to delete ${projectMeta.title}?`)
                          if (result) {
                            props.projectLoader.deleteProject(projectMeta.id).then(() => {
                              setProjects(props.projectLoader.listProjectMetadata())
                            })
                          }
                          return false
                        }}
                      ></IconButton>
                    </Flex>
                  </Link>
                )
              })}
            </VStack>
          </Box>
        </VStack>
      </Container>
    </React.Fragment>
  )
}
