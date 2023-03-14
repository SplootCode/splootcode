import React from 'react'
import { Box, Text } from '@chakra-ui/react'
import { HTTPResponse } from '@splootcode/core'
import { parse as parseContentType } from 'content-type'

interface TextBasedProps {
  content: string
}

function TextBased(props: TextBasedProps) {
  return (
    <pre>
      <Text fontSize={'sm'} fontFamily={'Inconsolata, monospace'}>
        {props.content}
      </Text>
    </pre>
  )
}

export interface ResponseViewerProps {
  response: HTTPResponse
}

export function ResponseViewer(props: ResponseViewerProps) {
  const { response } = props

  console.log(response)

  let body = null

  if (response) {
    const contentType = parseContentType(response.headers['Content-Type'])

    if (contentType.type === 'application/json') {
      body = <TextBased content={JSON.stringify(JSON.parse(response.body), null, 2)}></TextBased>
    } else {
      body = <TextBased content={response.body} />
    }
  } else {
    body = <Text>No content...</Text>
  }
  return (
    <Box p="1" backgroundColor={'#040810'} borderBottom={'1px solid var(--chakra-colors-gray-800)'}>
      <Text>
        Response{' '}
        <Text as="span" color={'green.400'}>
          200
        </Text>
      </Text>

      {body}
    </Box>
  )
}
