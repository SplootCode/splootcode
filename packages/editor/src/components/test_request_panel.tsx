import React, { useEffect } from 'react'
import { AddIcon } from '@chakra-ui/icons'
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
  runSettings: RunSettings
  scenarioIndex: number
  setNewRunSettings: (newRunSettings: RunSettings) => void
}) {
  const { runSettings, scenarioIndex, setNewRunSettings } = props
  const savedScenario = runSettings.httpScenarios[scenarioIndex]
  const [editingScenario, setEditingScenario] = React.useState(savedScenario)

  useEffect(() => {
    setEditingScenario(savedScenario)
  }, [savedScenario])

  const saveScenario = (index: number, newScenario: HTTPScenario) => {
    const newRunSettings = { ...runSettings }
    newRunSettings.httpScenarios[index] = newScenario
    setNewRunSettings(newRunSettings)
  }

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
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input
          type="text"
          size="sm"
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
        <FormLabel>Method</FormLabel>
        <Select
          size="sm"
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
      <Button onClick={() => saveScenario(scenarioIndex, editingScenario)}>Save</Button>
    </form>
  )
}

function RequestScenariosList(props: { runSettings: RunSettings; selectRequest: (requestIndex: number) => void }) {
  const { runSettings, selectRequest } = props

  if (runSettings.httpScenarios.length == 0) {
    return <Text>No test requests defined.</Text>
  }

  return (
    <>
      {runSettings.httpScenarios.map((scenario, i) => {
        return (
          <Button key={i} onClick={() => selectRequest(i)}>
            {scenario.name}
          </Button>
        )
      })}
    </>
  )
}

export function TestRequestPanel(props: TestRequestPanelProps) {
  const { project } = props

  const [editingRequest, setEditingRequest] = React.useState<number | null>(null)
  const [runSettings, setRunSettings] = React.useState(project.runSettings)

  useEffect(() => {
    setRunSettings(project.runSettings)
  }, [project.runSettings])

  const saveRunSettings = (newRunSettings: RunSettings) => {
    project.setRunSettings(newRunSettings)
    setRunSettings(newRunSettings)
  }

  const newTestRequest = () => {
    const newRunSettings = { ...project.runSettings }
    newRunSettings.httpScenarios = [...project.runSettings.httpScenarios, generateEmptyScenario()]
    saveRunSettings(newRunSettings)
    setEditingRequest(newRunSettings.httpScenarios.length - 1)
  }

  const selectRequest = (requestIndex: number) => {
    setEditingRequest(requestIndex)
  }

  if (editingRequest === null) {
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
          <RequestScenariosList runSettings={runSettings} selectRequest={selectRequest} />
        </Box>
      </div>
    )
  }

  return (
    <div className="test-request-panel">
      <Box px={3} py={3} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
        <HStack justifyContent={'space-between'}>
          <Text as={'h2'} color="gray.200">
            <Button variant={'ghost'} size="sm" onClick={() => setEditingRequest(null)}>
              Back
            </Button>
          </Text>
        </HStack>
      </Box>
      <Box py={1} px={3}>
        <RequestScenarioEdit
          runSettings={runSettings}
          scenarioIndex={editingRequest}
          setNewRunSettings={saveRunSettings}
        />
      </Box>
    </div>
  )
}
