import React from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { EditorNodeBlock } from '../node_block'
import { Entry } from './entry'
import { NodeBlock } from '../../layout/rendered_node'
import { NodeSelectionState } from '../../context/selection'
import { SerializedNode, deserializeNode } from '@splootcode/core/language/type_registry'
import { TrayCategory } from '@splootcode/core/language/tray/tray'

export interface CategoryProps {
  category: TrayCategory
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

export function getNodeBlock(node: SerializedNode) {
  const splootNode = deserializeNode(node)
  const nodeBlock = new NodeBlock(null, splootNode, null, 0)
  nodeBlock.calculateDimensions(0, 0, null)
  return nodeBlock
}

const MicroNodeInternal = (props: {
  nodeBlock: NodeBlock
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}) => {
  const { nodeBlock, startDrag } = props

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    startDrag(nodeBlock, 0, 0)
  }

  return (
    <div draggable={true} onDragStart={onDragStart}>
      <svg className="autocomplete-inline-svg" height={nodeBlock.rowHeight} width={nodeBlock.rowWidth + 2}>
        <EditorNodeBlock block={nodeBlock} selection={null} selectionState={NodeSelectionState.UNSELECTED} />
      </svg>
    </div>
  )
}

export const MicroNode = React.memo(MicroNodeInternal)

const CategoryView = (props: CategoryProps) => {
  const { category, startDrag } = props
  return (
    <Accordion allowMultiple>
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
        const nodeBlock = getNodeBlock(listing.serializedNode)
        return (
          <AccordionItem key={listing.key} border={'none'}>
            {({ isExpanded }) => (
              <>
                <AccordionButton size={'sm'} border={'none'} px={0} py={1}>
                  {isExpanded ? <ChevronDownIcon mr={1} /> : <ChevronRightIcon mr={1} />}
                  <MicroNode nodeBlock={nodeBlock} startDrag={startDrag} />
                  <Text pl={1}>{listing.title}</Text>
                </AccordionButton>
                <AccordionPanel p={0} mb={2} borderY={'solid 1px'} borderColor={'gray.600'}>
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
