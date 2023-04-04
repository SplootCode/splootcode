import './tray.css'

import React, { useCallback, useContext, useEffect, useState } from 'react'

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
import { EditorState, EditorStateContext } from '../../context/editor_context'
import { ImportsTray } from './imports_tray'
import { ModuleTrayLoader } from '../editor_side_menu'
import { PYTHON_FILE, PythonFile, PythonLanguageTray, PythonModuleInfo, PythonNode } from '@splootcode/language-python'
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
  const [tabIndex, setTabIndex] = useState(0)

  const editorContext = useContext<EditorState>(EditorStateContext)

  useEffect(() => {
    setListing(getTrayListing(props.rootNode))
  }, [props.rootNode])

  const addModuleImport = useCallback(
    (module: PythonModuleInfo) => {
      if (module.isStandardLib) {
        ;(rootNode as PythonFile).addModuleImport(module.name)
      } else {
        editorContext.project.putDependency({
          name: module.name,
          version: '',
        })
      }
      setTabIndex(1)
    },
    [rootNode]
  )

  return (
    <div className="tray">
      <Tabs index={tabIndex} onChange={(index) => setTabIndex(index)} position="relative">
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
                setTabIndex(2)
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
            <ImportsTray
              rootNode={rootNode as PythonNode}
              startDrag={startDrag}
              moduleTrayLoader={moduleTrayLoader}
              addImports={() => {
                setTabIndex(2)
              }}
            />
          </TabPanel>
          <TabPanel px={2} py={2}>
            <AddImportModal importModule={addModuleImport} isOpen={tabIndex === 2} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
