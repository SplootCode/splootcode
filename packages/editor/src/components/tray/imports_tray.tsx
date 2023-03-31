import React, { useCallback, useEffect, useState } from 'react'
import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Box, Button, Text } from '@chakra-ui/react'
import { Category } from './category'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { ModuleTrayLoader } from '../editor_side_menu'
import { PythonNode } from '@splootcode/language-python'
import { RenderedFragment } from '../../layout/rendered_fragment'
import {
  ScopeMutation,
  ScopeMutationType,
  ScopeObserver,
  TrayCategory,
  globalMutationDispatcher,
} from '@splootcode/core'

interface ImportsTrayProps {
  rootNode: PythonNode
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
  moduleTrayLoader: ModuleTrayLoader
  addImports: () => void
}

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

  const [importsList, setImportsList] = useState<string[]>([])

  const refreshModuleList = useCallback(() => {
    const scope = rootNode.getScope()
    setImportsList(scope.getImportedModules())
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
    globalMutationDispatcher.registerScopeObserver(scopeObserver)
    return () => {
      globalMutationDispatcher.deregisterScopeObserver(scopeObserver)
    }
  }, [rootNode])

  return (
    <Box>
      <Accordion allowToggle>
        {importsList.length === 0 ? (
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
      </Accordion>
    </Box>
  )
}
