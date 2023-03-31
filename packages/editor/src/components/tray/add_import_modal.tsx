import React, { useEffect, useState } from 'react'

import Fuse from 'fuse.js'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'

import { PythonModuleInfo, SupportedModuleList } from '@splootcode/language-python'

interface AddImportModalProps {
  isOpen: boolean
  importModule: (moduleName: string) => void
  onClose: () => void
}

export function AddImportModal(props: AddImportModalProps) {
  const { isOpen, onClose, importModule } = props

  const [selected, setSelected] = useState(null as string | null)
  const [query, setQuery] = useState('')
  const [fuse, setFuse] = useState(null as Fuse<PythonModuleInfo> | null)
  const [searchResultsList, setSearchResultsList] = useState([] as PythonModuleInfo[])

  useEffect(() => {
    if (isOpen) {
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
      const fuse = new Fuse(SupportedModuleList, options)
      setFuse(fuse)
    }
  }, [isOpen])

  useEffect(() => {
    if (fuse && query.length >= 2) {
      const results = fuse.search(query).map((res) => res.item)
      setSelected(null)
      setSearchResultsList(results.slice(0, 5))
    } else {
      setSearchResultsList([])
    }
  }, [fuse, query])

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add imported package</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl py={2}>
              <FormLabel htmlFor="title">Search packages</FormLabel>
              <Input id="title" type="text" autoFocus onChange={(e) => setQuery(e.target.value)} />
            </FormControl>
            {searchResultsList.map((moduleInfo) => {
              return (
                <Box
                  key={moduleInfo.name}
                  p={2}
                  onClick={() => {
                    setSelected(moduleInfo.name)
                  }}
                  borderRadius={4}
                  mb={2}
                  borderWidth={'1px'}
                  borderColor={'gray.300'}
                  backgroundColor={selected === moduleInfo.name ? 'blue.700' : 'transparent'}
                >
                  <Text fontWeight={'bold'}>
                    {moduleInfo.name}{' '}
                    <Text as={'span'} fontWeight={'normal'}>
                      {moduleInfo.isStandardLib ? '(Python standard library)' : ''}
                    </Text>
                  </Text>
                  <Text>{moduleInfo.description.substring(0, 50)}</Text>
                </Box>
              )
            })}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              disabled={!selected}
              onClick={() => {
                importModule(selected)
                onClose()
              }}
            >
              Import module
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
