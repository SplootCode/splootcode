import React from 'react'

import { Box, Text } from '@chakra-ui/react'
import { MicroNode } from './category'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { TrayEntry } from '@splootcode/core'
import { deserializeFragment } from '@splootcode/core'

export interface EntryProps {
  entry: TrayEntry
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

export const Entry = (props: EntryProps) => {
  const { entry, startDrag } = props
  return (
    <>
      <Text py={3} pl={0} pr={1} className={'tray-entry-abstract'}>
        {entry.abstract}
      </Text>
      {entry.examples?.length === 0 ? null : (
        <Text
          className="tray-entry-example-label"
          pt={3}
          pb={2}
          pl={0}
          pr={1}
          borderTop={'1px solid'}
          borderColor={'gray.500'}
        >
          Examples:
        </Text>
      )}
      {entry.examples?.map((example, idx) => {
        const fragment = new RenderedFragment(deserializeFragment(example.serializedNodes), true)
        return (
          <Box key={idx} py={2}>
            <MicroNode fragment={fragment} startDrag={startDrag} />
            <Text textColor={'gray.400'} lineHeight={1.1} pt={1} pb={2} pl={0} pr={1}>
              {example.description}
            </Text>
          </Box>
        )
      })}
    </>
  )
}
