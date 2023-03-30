import './tray.css'

import React, { useCallback, useEffect, useState } from 'react'

import { AddIcon } from '@chakra-ui/icons'
import { AddImportModal } from './add_import_modal'
import {
  ButtonGroup,
  HStack,
  IconButton,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { Category } from './category'
import { ImportsTray } from './imports_tray'
import { ModuleTrayLoader } from '../editor_side_menu'
import { PYTHON_FILE, PythonFile, PythonLanguageTray, PythonNode } from '@splootcode/language-python'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { ScopeTray } from './scope_tray'
import { SplootNode, TrayCategory } from '@splootcode/core'

interface TrayProps {
  rootNode: SplootNode
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
  moduleTrayLoader: ModuleTrayLoader
}

function getTrayListing(rootNode: SplootNode): TrayCategory {
  if (!rootNode || rootNode.type === PYTHON_FILE) {
    const tray = PythonLanguageTray

    return tray
  }
  return {
    category: '',
    entries: [],
  }
}

export function Tray(props: TrayProps) {
  const { rootNode, startDrag, moduleTrayLoader } = props
  const [listing, setListing] = useState(null)
  const [addImportModalOpen, setAddImportModalOpen] = useState(false)

  useEffect(() => {
    setListing(getTrayListing(props.rootNode))
  }, [props.rootNode])

  const addModuleImport = useCallback(
    (moduleName: string) => {
      ;(rootNode as PythonFile).addModuleImport(moduleName)
    },
    [rootNode]
  )

  return (
    <div className="tray">
      <AddImportModal
        isOpen={addImportModalOpen}
        onClose={() => setAddImportModalOpen(false)}
        importModule={addModuleImport}
      />

      <Tabs defaultIndex={0} position="relative">
        <HStack justifyContent={'space-between'} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
          <TabList borderBottom={'none'} color={'gray.400'}>
            <Tab py={3} px={3} _selected={{ color: 'gray.200' }}>
              <Text as={'h2'}>Python</Text>
            </Tab>
            <Tab py={3} _selected={{ color: 'gray.200' }}>
              <Text as={'h2'}>Imports</Text>
            </Tab>
          </TabList>
          <ButtonGroup px={2}>
            <IconButton
              size="sm"
              aria-label="New variable"
              icon={<AddIcon />}
              onClick={() => {
                setAddImportModalOpen(true)
              }}
            ></IconButton>
          </ButtonGroup>
        </HStack>
        <TabIndicator mt="-1.5px" height="2px" bg="gray.400" borderRadius="1px" />
        <TabPanels>
          <TabPanel px={2} py={2}>
            {rootNode ? <ScopeTray rootNode={rootNode as PythonNode} startDrag={startDrag} /> : null}
            {listing ? <Category category={listing} startDrag={startDrag} /> : null}
          </TabPanel>
          <TabPanel px={2} py={2}>
            <ImportsTray rootNode={rootNode as PythonNode} startDrag={startDrag} moduleTrayLoader={moduleTrayLoader} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
