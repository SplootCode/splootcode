import React, { useEffect } from 'react'
import { AddIcon, ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { HTTPScenario, Project, RunSettings } from '@splootcode/core'

interface TestRequestPanelProps {
  project: Project
}

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

function generateEmptyScenario(): HTTPScenario {
  return {
    name: 'New test request',
    rawQueryString: '?',
    headers: {},
    method: 'GET',
    path: '/',
    protocol: 'HTTP/1.1',
    body: '',
    isBase64Encoded: false,
  }
}

function RequestScenarioEdit(props: {
  currentScenario: HTTPScenario
  saveScenario: (newScenario: HTTPScenario) => void
  deleteScenario: (scenarioID: number) => void
}) {
  const { currentScenario, saveScenario, deleteScenario } = props
  const [editingScenario, setEditingScenario] = React.useState(currentScenario)

  useEffect(() => {
    setEditingScenario(currentScenario)
  }, [currentScenario])

  const setValue = (key: string, newValue: string) => {
    const newScenario = { ...editingScenario }
    newScenario[key] = newValue
    setEditingScenario(newScenario)
    if (key === 'method') {
      saveScenario(newScenario)
    }
  }

  return (
    <>
      <form>
        <VStack gap={0.5} py={2} alignItems="start">
          <Text textAlign="left" as="h4" fontWeight={'bold'}>
            {editingScenario.name}
          </Text>
          <FormControl>
            <FormLabel mb={0.5} fontSize={'sm'}>
              Name
            </FormLabel>
            <Input
              type="text"
              size="sm"
              fontSize={'md'}
              autoComplete="off"
              aria-label="Name"
              backgroundColor={'gray.800'}
              placeholder="Name"
              onChange={(e) => setValue('name', e.target.value)}
              onBlur={(e) => saveScenario(editingScenario)}
              value={editingScenario.name}
              m={0}
              variant="filled"
            />
          </FormControl>
          <FormControl>
            <FormLabel mb={0.5} fontSize={'sm'}>
              Method
            </FormLabel>
            <Select
              size="sm"
              fontSize={'md'}
              autoComplete="off"
              aria-label="Method"
              backgroundColor={'gray.800'}
              onChange={(e) => {
                setValue('method', e.target.value)
              }}
              value={editingScenario.method}
              m={0}
              variant="filled"
            >
              {methods.map((method) => {
                return (
                  <option key={method} value={method}>
                    {method}
                  </option>
                )
              })}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel mb={0.5} fontSize={'sm'}>
              Path
            </FormLabel>
            <Input
              type="text"
              size="sm"
              fontSize={'md'}
              autoComplete="off"
              aria-label="Path"
              backgroundColor={'gray.800'}
              placeholder="/"
              onChange={(e) => setValue('path', e.target.value)}
              onBlur={(e) => saveScenario(editingScenario)}
              value={editingScenario.path}
              m={0}
              variant="filled"
            />
          </FormControl>
          <FormControl>
            <FormLabel mb={1} fontSize={'sm'}>
              Body
            </FormLabel>
            <Textarea
              fontSize={'md'}
              aria-label="Name"
              fontFamily={'Inconsolata, monospace'}
              backgroundColor={'gray.800'}
              onChange={(e) => setValue('body', e.target.value)}
              onBlur={(e) => saveScenario(editingScenario)}
              value={editingScenario.body}
              m={0}
              variant="filled"
            />
          </FormControl>
        </VStack>
      </form>
      <Flex py={2}>
        <Button
          onClick={() => deleteScenario(editingScenario.id)}
          width={'100%'}
          size="sm"
          fontSize={'md'}
          colorScheme="red"
          borderColor={'red.500'}
          color={'red.500'}
          variant={'outline'}
        >
          Delete test request
        </Button>
      </Flex>
    </>
  )
}

function RequestScenariosList(props: { runSettings: RunSettings; selectScenario: (scenario: HTTPScenario) => void }) {
  const { runSettings, selectScenario } = props

  if (runSettings.httpScenarios.length == 0) {
    return <Text>No test requests defined.</Text>
  }

  return (
    <VStack alignItems={'stretch'} py={2}>
      {runSettings.httpScenarios.map((scenario) => {
        return (
          <Button
            key={scenario.id}
            backgroundColor={'gray.800'}
            px={3}
            py={0}
            size={'sm'}
            fontSize={'md'}
            justifyContent={'space-between'}
            fontWeight={'normal'}
            onClick={() => selectScenario(scenario)}
          >
            <Box py={0} textOverflow="ellipsis" overflow={'hidden'}>
              {scenario.name}
            </Box>
            <Box py={0}>{scenario.method}</Box>
          </Button>
        )
      })}
    </VStack>
  )
}

export function TestRequestPanel(props: TestRequestPanelProps) {
  const { project } = props

  const [editingScenario, setEditingRequest] = React.useState<HTTPScenario | null>(null)
  const [runSettings, setRunSettings] = React.useState(project.runSettings)

  useEffect(() => {
    setRunSettings(project.runSettings)
  }, [project.runSettings])

  const saveScenario = async (scenario: HTTPScenario) => {
    const savedScenario = await project.putHTTPScenario(scenario)
    setEditingRequest(savedScenario)
    setRunSettings(project.runSettings)
  }

  const deleteScenario = async (scenarioID: number) => {
    await project.deleteHTTPScenario(scenarioID)
    setEditingRequest(null)
    setRunSettings(project.runSettings)
  }

  const newTestRequest = async () => {
    const scenario = generateEmptyScenario()
    const savedScenario = await project.putHTTPScenario(scenario)
    setRunSettings(project.runSettings)
    setEditingRequest(savedScenario)
  }

  const selectRequest = (scenario: HTTPScenario) => {
    setEditingRequest(scenario)
  }

  if (editingScenario === null) {
    return (
      <div className="test-request-panel">
        <Box px={3} py={3} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
          <HStack justifyContent={'space-between'}>
            <Text as={'h2'} color="gray.200">
              Test Requests
            </Text>
            <ButtonGroup>
              <IconButton
                size="sm"
                aria-label="New variable"
                icon={<AddIcon />}
                onClick={() => newTestRequest()}
              ></IconButton>
            </ButtonGroup>
          </HStack>
        </Box>
        <Box py={1} px={3}>
          <RequestScenariosList runSettings={runSettings} selectScenario={selectRequest} />
        </Box>
      </div>
    )
  }

  return (
    <div className="test-request-panel">
      <Box px={3} py={3} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
        <HStack justifyContent={'space-between'}>
          <Button
            leftIcon={<ChevronLeftIcon fontSize={'xl'} />}
            variant={'ghost'}
            size="sm"
            pl={1}
            onClick={() => setEditingRequest(null)}
          >
            Back
          </Button>
        </HStack>
      </Box>
      <Box py={1} px={3}>
        <RequestScenarioEdit
          currentScenario={editingScenario}
          saveScenario={saveScenario}
          deleteScenario={deleteScenario}
        />
      </Box>
    </div>
  )
}
