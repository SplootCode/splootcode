import React from 'react'

import { MicroNode } from './category'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SplootFragment } from '@splootcode/core/language/types/fragment'
import { Text } from '@chakra-ui/react'
import { TrayEntry } from '@splootcode/core/language/tray/tray'

export interface EntryProps {
  entry: TrayEntry
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

export function getFragment(nodes: SerializedNode[]): RenderedFragment {
  const splootNodes = nodes.map(deserializeNode)
  const fragment = new SplootFragment(splootNodes)
  return new RenderedFragment(fragment, true)
}

export const Entry = (props: EntryProps) => {
  const { entry, startDrag } = props
  return (
    <>
      <Text textColor={'gray.400'} lineHeight={1.1} py={2} px={1}>
        {entry.abstract}
      </Text>
      {entry.examples?.map((example, idx) => {
        const fragment = getFragment(example.serializedNodes)
        return (
          <React.Fragment key={idx}>
            <Text
              textColor={'gray.400'}
              lineHeight={1.1}
              py={2}
              px={1}
              borderTop={'1px solid'}
              borderColor={'gray.700'}
            >
              Example:
            </Text>
            <MicroNode fragment={fragment} startDrag={startDrag} />
            <Text textColor={'gray.400'} lineHeight={1.1} p={1} py={2} px={1}>
              {example.description}
            </Text>
          </React.Fragment>
        )
      })}
    </>
  )
}
