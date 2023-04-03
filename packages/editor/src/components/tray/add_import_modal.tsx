import React, { useEffect, useState } from 'react'

import Fuse from 'fuse.js'
import { Box, FormControl, HStack, IconButton, Input, Spacer, Text, VStack } from '@chakra-ui/react'

import { AddIcon } from '@chakra-ui/icons'
import { ENABLE_INSTALLABLE_PACKAGES_FLAG, loadFeatureFlags } from '@splootcode/core'
import { PythonModuleInfo, SupportedModuleList } from '@splootcode/language-python'

interface AddImportModalProps {
  isOpen: boolean
  importModule: (moduleInfo: PythonModuleInfo) => void
}

function PackageListing(props: { importModule: (moduleInfo: PythonModuleInfo) => void; moduleInfo: PythonModuleInfo }) {
  const { importModule, moduleInfo } = props
  return (
    <HStack alignContent={'space-between'} pb={2}>
      <Box>
        <Text fontWeight={'bold'}>{moduleInfo.name}</Text>
        <Text fontStyle={'italic'} color="gray.400">
          {moduleInfo.description.substring(0, 50)}
        </Text>
      </Box>
      <Spacer />
      <IconButton
        my={1}
        size="sm"
        aria-label="New variable"
        icon={<AddIcon />}
        onClick={() => importModule(moduleInfo)}
      ></IconButton>
    </HStack>
  )
}

const recommendedModules = ['csv', 'datetime', 'random', 'requests']

export function AddImportModal(props: AddImportModalProps) {
  const { isOpen, importModule } = props

  const [query, setQuery] = useState('')
  const [fuse, setFuse] = useState(null as Fuse<PythonModuleInfo> | null)
  const [searchResultsList, setSearchResultsList] = useState([] as PythonModuleInfo[])

  const featureFlags = loadFeatureFlags()

  useEffect(() => {
    if (isOpen) {
      let supportedModules = SupportedModuleList

      if (!featureFlags.get(ENABLE_INSTALLABLE_PACKAGES_FLAG)) {
        supportedModules = supportedModules.filter((moduleInfo) => {
          return moduleInfo.isStandardLib || moduleInfo.name === 'requests'
        })
      }

      const options: Fuse.IFuseOptions<PythonModuleInfo> = {
        keys: [
          { name: 'name', weight: 0.8 },
          { name: 'description', weight: 0.1 },
        ],
        isCaseSensitive: false,
        threshold: 0.4,
        minMatchCharLength: 2,
        findAllMatches: true,
        fieldNormWeight: 2.0,
      }
      const fuse = new Fuse(supportedModules, options)
      setFuse(fuse)
    }
  }, [isOpen])

  useEffect(() => {
    if (fuse && query.length >= 2) {
      const results = fuse.search(query).map((res) => res.item)
      setSearchResultsList(results.slice(0, 5))
    } else {
      setSearchResultsList([])
    }
  }, [fuse, query])

  const curatedModules = SupportedModuleList.filter((moduleInfo) => {
    return recommendedModules.includes(moduleInfo.name)
  })

  return (
    <Box px={1}>
      <FormControl pb={1}>
        <Input
          id="title"
          type="text"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          variant="flushed"
          placeholder="Search available modules"
          _placeholder={{ color: 'gray.500' }}
        />
      </FormControl>

      <VStack alignItems={'stretch'} pb={1}>
        {searchResultsList.map((moduleInfo) => {
          return <PackageListing key={moduleInfo.name} importModule={importModule} moduleInfo={moduleInfo} />
        })}
      </VStack>
      {query.length === 0 ? (
        <VStack alignItems={'stretch'} py={2}>
          <Text>Recommended modules</Text>
          <Box borderLeft="1px" borderColor={'gray.600'} pl={2}>
            {curatedModules.map((moduleInfo) => {
              return <PackageListing key={moduleInfo.name} importModule={importModule} moduleInfo={moduleInfo} />
            })}
          </Box>
        </VStack>
      ) : null}
    </Box>
  )
}
