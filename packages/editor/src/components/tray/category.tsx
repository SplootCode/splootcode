import React from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { Entry } from './entry'
import { FragmentView } from '../fragment'
import { RenderedFragment } from '../../layout/rendered_fragment'
import {
  SerializedNode,
  SplootFragment,
  TrayCategory,
  deserializeNode,
  getNodeCategoriesForType,
} from '@splootcode/core'

export interface CategoryProps {
  category: TrayCategory
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

export function getSingleNodeFragment(node: SerializedNode, includeBlock: boolean): RenderedFragment {
  if (!node) {
    return null
  }
  const splootNode = deserializeNode(node)
  const nodeCategories = Array.from(getNodeCategoriesForType(node.type))
  const fragment = new SplootFragment([splootNode], nodeCategories[0])
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
            <AccordionItem key={listing.category} border={'none'} isDisabled={listing.entries.length === 0} py={0}>
              {({ isExpanded }) => (
                <>
                  <AccordionButton border={'none'} px={0} py={1} mb={1} fontSize={'14px'} _hover={{ bg: 'gray.700' }}>
                    {isExpanded ? (
                      <ChevronDownIcon textColor={'gray.400'} mr={0.5} />
                    ) : (
                      <ChevronRightIcon textColor={'gray.400'} mr={0.5} />
                    )}
                    {listing.category}
                  </AccordionButton>
                  <AccordionPanel pt={0} pr={0} pb={1} pl={2} mb={1} ml={2} className={'tray-expanded-category'}>
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
                <AccordionButton border={'none'} px={0} py={1} mb={1} fontSize={'14px'} _hover={{ bg: 'gray.700' }}>
                  {isExpanded ? (
                    <ChevronDownIcon textColor={'gray.400'} mr={0.5} />
                  ) : (
                    <ChevronRightIcon textColor={'gray.400'} mr={0.5} />
                  )}
                  <MicroNode fragment={fragment} startDrag={startDrag} />
                  <Text pl={1}>{listing.title}</Text>
                </AccordionButton>
                <AccordionPanel p={0} pl={0} ml={1} pb={1} mt={0} mb={3} className={'tray-expanded-entry'}>
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
