import React from 'react'
import { Box, Collapse, Flex, IconButton, Input, Text, useDisclosure } from '@chakra-ui/react'
import { HTTPResponse } from '@splootcode/core'
import { parse as parseContentType } from 'content-type'

import { MdExpandLess, MdExpandMore } from 'react-icons/md'
import { getReasonPhrase } from 'http-status-codes'

interface TextBasedProps {
  content: string
}

function TextBased(props: TextBasedProps) {
  return (
    <Text
      as="pre"
      whiteSpace={'pre-wrap'}
      fontSize={'15px'}
      fontFamily={'Inconsolata, monospace'}
      backgroundColor={'gray.800'}
      px="1"
      borderRadius={'sm'}
      width="100%"
    >
      {props.content}
    </Text>
  )
}

export interface ResponseViewerProps {
  response: HTTPResponse
}

export function ResponseViewer(props: ResponseViewerProps) {
  const { response } = props

  let body = null

  let headers = []

  if (response) {
    const contentType = parseContentType(response.headers['Content-Type'])

    if (contentType.type === 'application/json') {
      body = <TextBased content={JSON.stringify(JSON.parse(response.body), null, 2)}></TextBased>
    } else {
      body = <TextBased content={response.body} />
    }

    headers = Object.entries(response.headers)
  } else {
    body = <Text>No content...</Text>
  }

  const { isOpen, onToggle } = useDisclosure()

  return (
    <Box height={'100%'} backgroundColor={'#040810'}>
      <Box p="3" overflowY={'scroll'} height={'100%'}>
        <Box mb="4">
          <Text fontWeight={'bold'}>Status code</Text>
          <Text fontFamily={'Inconsolata'}>
            {response ? (
              <>
                <Text as="span" color={'green.400'}>
                  {response.statusCode}
                </Text>
                {' | '}
                {getReasonPhrase(response?.statusCode)}
              </>
            ) : (
              <Text as="span" color={'gray.400'}>
                Loading...
              </Text>
            )}
          </Text>
        </Box>

        <Box mb="4">
          <Flex alignItems={'center'}>
            <Text fontWeight={'bold'}>Headers</Text>
            <IconButton
              aria-label="Expand headers"
              icon={isOpen ? <MdExpandLess /> : <MdExpandMore />}
              onClick={onToggle}
              variant="ghost"
              size={'xs'}
              fontSize="md"
            >
              {' '}
            </IconButton>
          </Flex>

          <Collapse in={isOpen} animateOpacity>
            {headers.map(([key, value], i) => {
              return (
                <Box mb="2" key={i}>
                  <Input
                    px="1"
                    size={'sm'}
                    variant="filled"
                    readOnly
                    value={key}
                    mb="1"
                    backgroundColor={'gray.800'}
                  ></Input>
                  <Input
                    px="1"
                    size={'sm'}
                    variant="filled"
                    readOnly
                    value={value}
                    backgroundColor={'gray.800'}
                  ></Input>
                </Box>
              )
            })}
          </Collapse>
        </Box>

        <Box>
          <Text fontWeight={'bold'} mt="1">
            Body
          </Text>

          {body}
        </Box>
      </Box>
    </Box>
  )
}
