import React from 'react'
import { Box, Collapse, Flex, HStack, IconButton, Input, Text, useClipboard, useDisclosure } from '@chakra-ui/react'
import { HTTPResponse } from '@splootcode/core'
import { parse as parseContentType } from 'content-type'

import { ChevronDownIcon, ChevronUpIcon, CopyIcon } from '@chakra-ui/icons'
import { getReasonPhrase } from 'http-status-codes'

import './response_viewer.css'

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

export interface HeadersProps {
  headers: Record<string, string>
}

export function Headers(props: HeadersProps) {
  const { headers } = props
  const { isOpen, onToggle } = useDisclosure()

  const headersList = Object.entries(headers)

  return (
    <Box>
      {' '}
      <Flex alignItems={'center'}>
        <Text as="h2" fontWeight={'bold'} mb="1">
          Headers
        </Text>
        <IconButton
          aria-label="Expand headers"
          icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          onClick={onToggle}
          variant="ghost"
          size={'xs'}
          fontSize="md"
        >
          {' '}
        </IconButton>
      </Flex>
      <Collapse in={isOpen} animateOpacity>
        {headersList.length == 0 && <Text fontStyle={'italic'}>No headers...</Text>}

        {headersList.map(([key, value], i) => {
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
              <Input px="1" size={'sm'} variant="filled" readOnly value={value} backgroundColor={'gray.800'}></Input>
            </Box>
          )
        })}
      </Collapse>
    </Box>
  )
}

export interface StatusCodeInfoProps {
  statusCode: number
}

export function StatusCodeInfo(props: StatusCodeInfoProps) {
  const { statusCode } = props

  const statusColour = (code) => {
    if (code >= 200 && code < 300) {
      return 'green.400'
    } else if (code >= 400 && code < 600) {
      return 'red.400'
    }

    return 'white'
  }

  return (
    <Text fontFamily={'Inconsolata'}>
      {statusCode ? (
        <>
          <Text as="span" color={statusColour(statusCode)}>
            {statusCode}
          </Text>
          {' | '}
          {getReasonPhrase(statusCode)}
        </>
      ) : (
        <Text as="span" color={'gray.400'}>
          Loading...
        </Text>
      )}
    </Text>
  )
}

export function BodyInfo(props: { body: string; rawContentType: string }) {
  const { body, rawContentType } = props
  let formattedBody = null

  if (body) {
    if (rawContentType && parseContentType(rawContentType).type === 'application/json') {
      formattedBody = <TextBased content={JSON.stringify(JSON.parse(body), null, 2)}></TextBased>
    } else {
      formattedBody = <TextBased content={body} />
    }
  } else {
    formattedBody = <Text fontStyle={'italic'}>No content...</Text>
  }

  const { onCopy } = useClipboard(body)
  return (
    <Box>
      <HStack justifyContent={'space-between'} mb="1">
        <Text as="h2" fontWeight={'bold'}>
          Body
        </Text>

        <IconButton aria-label="Copy body" icon={<CopyIcon />} size="sm" onClick={onCopy}></IconButton>
      </HStack>

      {formattedBody}
    </Box>
  )
}

export function getHeader(headers: Record<string, string>, key: string) {
  const safeHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))

  return safeHeaders[key.toLowerCase()]
}

export function ResponseViewerInfo(props: ResponseViewerProps) {
  const { response } = props

  let rawContentType = undefined
  if (response) {
    rawContentType = getHeader(response.headers, 'content-type')
  }

  return (
    <>
      <Box mb="4">
        <Text as="h2" fontWeight={'bold'} mb="1">
          Status code
        </Text>
        <StatusCodeInfo statusCode={response?.statusCode} />
      </Box>

      <Box mb="4">
        <Headers headers={response?.headers || {}} />
      </Box>

      <BodyInfo body={response?.body} rawContentType={rawContentType} />
    </>
  )
}

export interface ResponseViewerProps {
  response: HTTPResponse
}

export function ResponseViewer(props: ResponseViewerProps) {
  return (
    <Box height={'100%'} backgroundColor={'#040810'}>
      <Box p="3" overflowY={'auto'} height={'100%'} id="response-viewer">
        <ResponseViewerInfo response={props.response}></ResponseViewerInfo>
      </Box>
    </Box>
  )
}
