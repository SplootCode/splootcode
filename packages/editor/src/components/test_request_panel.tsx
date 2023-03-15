import React, { useEffect } from 'react'
import { AddIcon, ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Text,
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
}) {
  const { currentScenario, saveScenario } = props
  const [editingScenario, setEditingScenario] = React.useState(currentScenario)

  useEffect(() => {
    setEditingScenario(currentScenario)
  }, [currentScenario])

  const setName = (newName: string) => {
    const newScenario = { ...editingScenario, name: newName }
    setEditingScenario(newScenario)
  }

  const setMethod = (newMethod: string) => {
    const newScenario = {
      ...editingScenario,
      method: newMethod,
    }
    setEditingScenario(newScenario)
  }

  return (
    <form>
      <VStack gap={1} py={2}>
        <FormControl>
          <FormLabel mb={1} fontSize={'sm'}>
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
            onChange={(e) => setName(e.target.value)}
            value={editingScenario.name}
            m={0}
            variant="filled"
          />
        </FormControl>
        <FormControl>
          <FormLabel mb={1} fontSize={'sm'}>
            Method
          </FormLabel>
          <Select
            size="sm"
            fontSize={'md'}
            autoComplete="off"
            aria-label="Method"
            backgroundColor={'gray.800'}
            onChange={(e) => setMethod(e.target.value)}
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
      </VStack>
      <HStack justifyContent={'flex-end'} py={1}>
        <Button onClick={() => saveScenario(editingScenario)}>Update</Button>
      </HStack>
    </form>
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
        <RequestScenarioEdit currentScenario={editingScenario} saveScenario={saveScenario} />
      </Box>
    </div>
  )
}
