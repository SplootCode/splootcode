import React from 'react'

import { MicroNode, getNodeBlock } from './category'
import { NodeBlock } from '../../layout/rendered_node'
import { Text } from '@chakra-ui/react'
import { TrayEntry } from '@splootcode/core/language/tray/tray'

export interface EntryProps {
  entry: TrayEntry
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

export const Entry = (props: EntryProps) => {
  const { entry, startDrag } = props
  return (
    <>
      <Text textColor={'gray.400'} lineHeight={1.1} py={2} px={1}>
        {entry.abstract}
      </Text>
      {entry.examples?.map((example, idx) => {
        const nodeBlock = getNodeBlock(example.serializedNode)
        return (
          <React.Fragment key={idx}>
            <Text
              textColor={'gray.400'}
              lineHeight={1.1}
              py={2}
              px={1}
              borderTop={'1px solid'}
              borderColor={'gray.600'}
            >
              Example:
            </Text>
            <MicroNode nodeBlock={nodeBlock} startDrag={startDrag} includeBlock={true} />
            <Text textColor={'gray.400'} lineHeight={1.1} p={1} py={2} px={1}>
              {example.description}
            </Text>
          </React.Fragment>
        )
      })}
    </>
  )
}
