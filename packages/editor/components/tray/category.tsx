import React from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Entry } from './entry'
import { FragmentView } from '../fragment'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { SplootFragment } from '@splootcode/core/language/types/fragment'
import { TrayCategory } from '@splootcode/core/language/tray/tray'

export interface CategoryProps {
  category: TrayCategory
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

export function getSingleNodeFragment(node: SerializedNode, includeBlock: boolean): RenderedFragment {
  if (!node) {
    return null
  }
  const splootNode = deserializeNode(node)
  const fragment = new SplootFragment([splootNode])
  return new RenderedFragment(fragment, includeBlock)
}

const MicroNodeInternal = (props: {
  fragment: RenderedFragment
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}) => {
  const { fragment: fragment, startDrag } = props

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    startDrag(fragment, 0, 0)
  }

  if (fragment === null) {
    return null
  }

  const height = fragment.height
  const width = fragment.width

  return (
    <div draggable={true} onDragStart={onDragStart}>
      <svg className="autocomplete-inline-svg" height={height} width={width}>
        <FragmentView fragment={fragment} />
      </svg>
    </div>
  )
}

export const MicroNode = React.memo(MicroNodeInternal)

const CategoryView = (props: CategoryProps) => {
  const { category, startDrag } = props
  return (
    <Accordion defaultIndex={[]} allowToggle>
      {category.entries.map((listing) => {
        if ('category' in listing) {
          return (
            <AccordionItem key={listing.category} border={'none'} isDisabled={listing.entries.length === 0}>
              {({ isExpanded }) => (
                <>
                  <AccordionButton size={'sm'} border={'none'} px={0} py={1}>
                    {isExpanded ? <ChevronDownIcon mr={1} /> : <ChevronRightIcon mr={1} />}
                    {listing.category}
                  </AccordionButton>
                  <AccordionPanel py={0} pl={2} pr={0}>
                    <Category category={listing} startDrag={startDrag} />
                  </AccordionPanel>
                </>
              )}
            </AccordionItem>
          )
        }
        const fragment = getSingleNodeFragment(listing.serializedNode, false)
        return (
          <AccordionItem key={listing.key} border={'none'}>
            {({ isExpanded }) => (
              <>
                <AccordionButton size={'sm'} border={'none'} px={0} py={1}>
                  {isExpanded ? <ChevronDownIcon mr={1} /> : <ChevronRightIcon mr={1} />}
                  <MicroNode fragment={fragment} startDrag={startDrag} />
                  <Text pl={1}>{listing.title}</Text>
                </AccordionButton>
                <AccordionPanel p={0} mb={2} borderY={'solid 1px'} borderColor={'gray.700'}>
                  <Entry entry={listing} startDrag={startDrag} />
                </AccordionPanel>
              </>
            )}
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

export const Category = React.memo(CategoryView)
