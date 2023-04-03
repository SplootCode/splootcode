import React, { useCallback, useContext, useEffect, useState } from 'react'
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  HStack,
  IconButton,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { Category } from './category'
import { ChevronDownIcon, ChevronRightIcon, DeleteIcon } from '@chakra-ui/icons'
import { EditorState, EditorStateContext } from '../../context/editor_context'
import { ModuleTrayLoader } from '../editor_side_menu'
import {
  ProjectMutationType,
  ProjectObserver,
  ScopeMutation,
  ScopeMutationType,
  ScopeObserver,
  TrayCategory,
  globalMutationDispatcher,
} from '@splootcode/core'
import { PythonNode, SupportedModuleList } from '@splootcode/language-python'
import { RenderedFragment } from '../../layout/rendered_fragment'

interface ImportsTrayProps {
  rootNode: PythonNode
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
  moduleTrayLoader: ModuleTrayLoader
  addImports: () => void
}

const dynamicallyInstallable = new Map(
  SupportedModuleList.map((module) => {
    return [module.name, module.isStandardLib]
  })
)

export const ImportedModuleCategory = (props: {
  name: string
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
  moduleTrayLoader: ModuleTrayLoader
}) => {
  const { name, startDrag, moduleTrayLoader } = props
  const [trayCategory, setTrayCategory] = useState<TrayCategory>(null)

  useEffect(() => {
    moduleTrayLoader.getTrayForModule(name).then((trayCategory: TrayCategory) => {
      setTrayCategory(trayCategory)
    })
  }, [name])

  if (!trayCategory) {
    const tempTrayCategory: TrayCategory = {
      category: name,
      entries: [],
    }
    return <Category category={tempTrayCategory} startDrag={startDrag} />
  }
  return <Category category={trayCategory} startDrag={startDrag} />
}

export const ImportsTray = (props: ImportsTrayProps) => {
  const { rootNode, startDrag, addImports, moduleTrayLoader } = props
  const editorContext = useContext<EditorState>(EditorStateContext)

  const [importsList, setImportsList] = useState<string[]>([])

  const [projectImports, setProjectImports] = useState<string[]>([])

  const refreshModuleList = useCallback(() => {
    const scopeImports = rootNode
      .getScope()
      .getImportedModules()
      .filter((moduleName) => dynamicallyInstallable.get(moduleName))

    const projectImports = editorContext.project.dependencies.map((dep) => dep.name)

    setImportsList(scopeImports)
    setProjectImports(projectImports)
  }, [rootNode])

  useEffect(() => {
    refreshModuleList()
    const scopeObserver: ScopeObserver = {
      handleScopeMutation: (mutation: ScopeMutation) => {
        if (mutation.type === ScopeMutationType.IMPORT_MODULE) {
          refreshModuleList()
        }
      },
    }

    const projectObserver: ProjectObserver = {
      handleProjectMutation(mutation) {
        if (mutation.type === ProjectMutationType.UPDATE_DEPENDENCIES) {
          refreshModuleList()
        }
      },
    }

    globalMutationDispatcher.registerProjectObserver(projectObserver)
    globalMutationDispatcher.registerScopeObserver(scopeObserver)
    return () => {
      globalMutationDispatcher.deregisterScopeObserver(scopeObserver)
      globalMutationDispatcher.deregisterProjectObserver(projectObserver)
    }
  }, [rootNode])

  return (
    <Box>
      <Accordion allowToggle>
        {importsList.length === 0 && projectImports.length === 0 ? (
          <Box textAlign={'center'}>
            <Text py={2} fontStyle="italic">
              No imported modules
            </Text>
            <Button onClick={addImports}>Add module</Button>
          </Box>
        ) : null}
        {importsList.map((importName) => {
          return (
            <AccordionItem key={importName} border={'none'} py={0}>
              {({ isExpanded }) => (
                <>
                  <AccordionButton border={'none'} px={0} py={1} mb={1} _hover={{ bg: 'gray.700' }}>
                    {isExpanded ? (
                      <ChevronDownIcon textColor={'gray.400'} mr={0.5} />
                    ) : (
                      <ChevronRightIcon textColor={'gray.400'} mr={0.5} />
                    )}
                    {importName}
                  </AccordionButton>
                  <AccordionPanel pt={0} pr={0} pb={1} pl={2} mb={1} ml={2} className={'tray-expanded-category'}>
                    <ImportedModuleCategory
                      name={importName}
                      startDrag={startDrag}
                      moduleTrayLoader={moduleTrayLoader}
                    />
                  </AccordionPanel>
                </>
              )}
            </AccordionItem>
          )
        })}
        {projectImports.map((importName) => {
          return (
            <AccordionItem key={importName} border={'none'} py={0}>
              {({ isExpanded }) => (
                <>
                  <HStack mb={1}>
                    <AccordionButton border={'none'} px={0} py={1} _hover={{ bg: 'gray.700' }}>
                      {isExpanded ? (
                        <ChevronDownIcon textColor={'gray.400'} mr={0.5} />
                      ) : (
                        <ChevronRightIcon textColor={'gray.400'} mr={0.5} />
                      )}
                      {importName}
                    </AccordionButton>
                    <Tooltip label="Uninstall dependency">
                      <IconButton
                        textColor={'gray.400'}
                        size="sm"
                        fontSize="sm"
                        variant={'ghost'}
                        icon={<DeleteIcon />}
                        aria-label="Uninstall dependency"
                        onClick={() => {
                          const dep = editorContext.project.dependencies.find((dep) => dep.name === importName)
                          editorContext.project.deleteDependency(dep.id)
                        }}
                      ></IconButton>
                    </Tooltip>
                  </HStack>
                  <AccordionPanel pt={0} pr={0} pb={1} pl={2} mb={1} ml={2} className={'tray-expanded-category'}>
                    <ImportedModuleCategory
                      name={importName}
                      startDrag={startDrag}
                      moduleTrayLoader={moduleTrayLoader}
                    />
                  </AccordionPanel>
                </>
              )}
            </AccordionItem>
          )
        })}
      </Accordion>
    </Box>
  )
}
