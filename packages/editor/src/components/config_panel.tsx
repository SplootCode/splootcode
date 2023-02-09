import React, { useCallback, useEffect, useState } from 'react'
import { AddIcon, DeleteIcon, QuestionIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { MicroNode } from './tray/category'
import { NodeCategory, Project, SerializedNode, SplootFragment, deserializeNode } from '@splootcode/core'
import { RenderedFragment } from 'src/layout/rendered_fragment'

interface ConfigPanelProps {
  project: Project
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

function EnvironmentUsage(props: {
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
  envVars: Map<string, [string, boolean]>
}) {
  const { startDrag, envVars } = props
  const serializedNodes: SerializedNode[] = [
    {
      type: 'PYTHON_IMPORT',
      properties: {},
      childSets: { modules: [{ type: 'PYTHON_MODULE_IDENTIFIER', properties: { identifier: 'os' }, childSets: {} }] },
    },
  ]

  for (const [name] of envVars) {
    serializedNodes.push({
      type: 'PYTHON_ASSIGNMENT',
      properties: {},
      childSets: {
        left: [{ type: 'PY_IDENTIFIER', properties: { identifier: name }, childSets: {} }],
        right: [
          {
            type: 'PYTHON_EXPRESSION',
            properties: {},
            childSets: {
              tokens: [
                {
                  type: 'PYTHON_SUBSCRIPT',
                  properties: {},
                  childSets: {
                    target: [
                      {
                        type: 'PYTHON_MEMBER',
                        properties: {
                          member: 'environ',
                        },
                        childSets: {
                          object: [{ type: 'PY_IDENTIFIER', properties: { identifier: 'os' }, childSets: {} }],
                        },
                      },
                    ],
                    key: [
                      {
                        type: 'PYTHON_EXPRESSION',
                        properties: {},
                        childSets: { tokens: [{ type: 'STRING_LITERAL', properties: { value: name }, childSets: {} }] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    })
  }

  const nodes = serializedNodes.map((node) =>
    deserializeNode({ type: 'PYTHON_STATEMENT', properties: {}, childSets: { statement: [node] } })
  )
  const fragment = new SplootFragment(nodes, NodeCategory.PythonStatement)
  const renderedFragment = new RenderedFragment(fragment, true)
  return (
    <Box px={2} py={3}>
      <Text as="h3" fontSize="md" py={2}>
        Example Usage
      </Text>
      <Box py={2}>
        <MicroNode fragment={renderedFragment} startDrag={startDrag} />
      </Box>
    </Box>
  )
}

function EnvironmentVar(props: {
  name: string
  value: string
  secret: boolean
  deleteVar: (name: string) => void
  updateVar: (prevName: string, newName: string, value: string, isSecret: boolean) => void
}) {
  const { name, value, secret, deleteVar, updateVar } = props
  const [show, setShow] = React.useState(false)
  const [newName, setNewName] = useState(name)
  const [newValue, setNewValue] = useState(value)
  const [newSecret, setNewSecret] = useState(secret)

  const handleClickShow = () => setShow(!show)

  const handleNameChange = (event) => setNewName(event.target.value)
  const handleValueChange = (event) => setNewValue(event.target.value)
  const handleSecretChange = (event) => setNewSecret(event.target.checked)

  useEffect(() => {
    // Props were updated, update state here.
    setNewName(name)
    setNewValue(value)
    setNewSecret(secret)
  }, [name, value, secret])

  const handleCancel = useCallback(() => {
    setNewName(name)
    setNewValue(value)
    setNewSecret(secret)
  }, [name, value, secret])

  const hasChanged = newName !== name || newValue !== value || newSecret !== secret

  const nameRegex = /^[a-zA-Z0-9_]*$/
  const nameStartWithRegex = /^[a-zA-Z_]/
  let nameError = null
  if (newName !== '' && !nameRegex.test(newName)) {
    nameError = 'Name can only include _, letters A-Z, and numbers'
  } else if (newName !== '' && !nameStartWithRegex.test(newName)) {
    nameError = 'Name cannot start with a number.'
  }

  return (
    <>
      <Box py={4}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            updateVar(name, newName, newValue, newSecret)
          }}
        >
          <Stack pb={1}>
            <HStack justifyContent={'space-between'}>
              <Text overflow={'hidden'} textOverflow="ellipsis" whiteSpace={'nowrap'} fontWeight="bold">
                {name}
              </Text>
              {name !== '' ? (
                <ButtonGroup>
                  <IconButton
                    size="sm"
                    variant={'ghost'}
                    color="gray.500"
                    aria-label="delete"
                    icon={<DeleteIcon />}
                    onClick={() => deleteVar(name)}
                  ></IconButton>
                </ButtonGroup>
              ) : null}
            </HStack>
            <FormControl isInvalid={!!nameError}>
              <Input
                type="text"
                size="sm"
                autoComplete="off"
                aria-label="Environment variable name"
                backgroundColor={'gray.800'}
                placeholder="Name"
                onChange={handleNameChange}
                value={newName}
                m={0}
                variant="filled"
              />
              {nameError ? <FormErrorMessage>{nameError}</FormErrorMessage> : null}
            </FormControl>
            <FormControl>
              <InputGroup size="sm">
                <Input
                  autoComplete="off"
                  aria-label="Environment variable value"
                  pr={newSecret ? '4.5rem' : undefined}
                  type={show || !newSecret ? 'text' : 'password'}
                  value={newValue}
                  onChange={handleValueChange}
                  backgroundColor={'gray.800'}
                  placeholder="Value"
                  variant="filled"
                />
                {newSecret ? (
                  <InputRightElement width="4.5rem">
                    <Button h="1.75rem" size="sm" onClick={handleClickShow}>
                      {show ? 'Hide' : 'Show'}
                    </Button>
                  </InputRightElement>
                ) : null}
              </InputGroup>
            </FormControl>
            <FormControl display="flex" alignItems="center" justifyContent={'space-between'}>
              <FormLabel htmlFor={`is-secret-${name}`} mb="0" fontSize={'md'} color="gray.400" pl={1}>
                Secret{' '}
                <Tooltip
                  label="Secret variables are private to you and will not be shared when the rest of the project is shared."
                  fontSize="md"
                >
                  <QuestionIcon mx={1} color={'gray.400'} />
                </Tooltip>
              </FormLabel>
              <Switch id={`is-secret-${name}`} isChecked={newSecret} onChange={handleSecretChange} />
            </FormControl>
            {hasChanged ? (
              <ButtonGroup justifyContent={'right'}>
                <Button size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" colorScheme="blue" disabled={!!nameError || newName === ''}>
                  Save changes
                </Button>
              </ButtonGroup>
            ) : null}
          </Stack>
        </form>
      </Box>
      <Divider borderColor="gray.500" borderBottomWidth={'1px'} />
    </>
  )
}

export function ConfigPanel(props: ConfigPanelProps) {
  const { project, startDrag } = props

  const [envVars, setEnvVars] = React.useState(Object.fromEntries(project.environmentVars))
  const varOrder = Object.keys(envVars)
  varOrder.sort()

  const updateEnvironmentVars = useCallback(() => {
    setEnvVars(Object.fromEntries(project.environmentVars))
  }, [project])

  useEffect(() => {}, [updateEnvironmentVars])

  const deleteVar = (name: string) => {
    project.deleteEnvironmentVar(name)
    setEnvVars(Object.fromEntries(project.environmentVars))
  }

  const updateVar = (prevName: string, newName: string, value: string, secret: boolean) => {
    if (prevName !== newName) {
      project.deleteEnvironmentVar(prevName)
    }
    project.setEnvironmentVar(newName, value, secret)
    setEnvVars(Object.fromEntries(project.environmentVars))
  }

  const newVar = () => {
    const newEnvVars = { '': ['', false] as [string, boolean], ...envVars }
    setEnvVars(newEnvVars)
  }

  const numberOfValidVars = varOrder.filter((name) => name !== '').length

  return (
    <div className="config-panel">
      <Box py={1} px={3}>
        <HStack justifyContent={'space-between'}>
          <Text as="h3" fontSize="md" py={2}>
            Environment Variables
          </Text>
          <ButtonGroup>
            <IconButton size="sm" aria-label="New variable" icon={<AddIcon />} onClick={() => newVar()}></IconButton>
          </ButtonGroup>
        </HStack>
        {varOrder.length === 0 ? (
          <Text fontStyle={'italic'} color="gray.400" py={3}>
            No environment variables set.
          </Text>
        ) : null}
        {varOrder.map((name) => {
          return (
            <EnvironmentVar
              key={name}
              name={name}
              value={envVars[name][0]}
              secret={envVars[name][1]}
              deleteVar={deleteVar}
              updateVar={updateVar}
            />
          )
        })}
      </Box>
      {numberOfValidVars !== 0 ? <EnvironmentUsage startDrag={startDrag} envVars={project.environmentVars} /> : null}
    </div>
  )
}
