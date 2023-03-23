import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react'

import {
  Alert,
  AlertIcon,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  useClipboard,
} from '@chakra-ui/react'
import { CopyIcon } from '@chakra-ui/icons'

interface RuntimeManager {
  getTextCode: () => Promise<string>
  running: boolean
  ready: boolean
  isValid: () => boolean
}

interface ExportTextModalProps {
  isOpen: boolean
  onClose: () => void
  runtimeManager: RuntimeManager
}

interface StatusMessage {
  status: 'info' | 'warning'
  message: string
}

export const ExportTextModal = observer((props: ExportTextModalProps) => {
  const { isOpen, onClose, runtimeManager } = props

  const [errorStatus, setErrorStatus] = useState(null as StatusMessage)
  const [textCode, setTextCode] = useState(null)

  const { onCopy, hasCopied } = useClipboard(textCode)

  useEffect(() => {
    if (isOpen && runtimeManager?.ready) {
      setErrorStatus(null)

      runtimeManager
        .getTextCode()
        .then((code) => {
          setTextCode(code)
          setErrorStatus(null)
        })
        .catch((reason) => {
          if (reason.message) {
            setErrorStatus({ status: 'warning', message: reason.message })
          } else {
            setErrorStatus({ status: 'warning', message: `${reason}` })
          }
        })
    }
  }, [isOpen, runtimeManager?.ready])

  let runtimeStatus = null
  if (isOpen && runtimeManager) {
    if (runtimeManager.running) {
      runtimeStatus = {
        status: 'warning',
        message:
          'Cannot generate text code while the project is still running. Please stop the currently running program.',
      }
    } else if (!runtimeManager.ready) {
      if (!runtimeManager.isValid()) {
        runtimeStatus = {
          status: 'warning',
          message:
            'The project code is not valid and will not generate valid Python text code. Fix up the errors or remove any incomplete code and try again.',
        }
      } else {
        runtimeStatus = { status: 'info', message: 'Waiting for runtime to be ready...' }
      }
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Export Python code</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {errorStatus !== null ? (
              <Alert status={errorStatus.status}>
                <AlertIcon />
                {errorStatus.message}
              </Alert>
            ) : (
              <>
                {runtimeStatus !== null ? (
                  <Alert status={runtimeStatus?.status}>
                    <AlertIcon />
                    {runtimeStatus?.message}
                  </Alert>
                ) : (
                  <Flex flexDirection="column" alignItems={'start'} gap={2}>
                    <Textarea
                      fontSize={'md'}
                      fontFamily={'Inconsolata, monospace'}
                      value={textCode || 'Generating text code...'}
                      readOnly
                      height={64}
                    ></Textarea>
                    <Button my={2} onClick={onCopy} colorScheme="gray" leftIcon={<CopyIcon />}>
                      {hasCopied ? 'Copied!' : 'Copy code'}
                    </Button>
                  </Flex>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
})
