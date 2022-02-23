import React, { useEffect, useState } from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Text } from '@chakra-ui/react'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { MicroNode, getNodeBlock } from './category'
import { NodeBlock } from '../../layout/rendered_node'
import { Scope } from '@splootcode/core/language/scope/scope'
import { ScopeObserver } from '@splootcode/core/language/observers'
import { SplootNode } from '@splootcode/core/language/node'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

export interface EntryProps {
  rootNode: SplootNode
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

export const ScopeTray = (props: EntryProps) => {
  const { rootNode, startDrag } = props
  const [rootScopeWrapped, setRootScope] = useState({ s: rootNode.getScope() })

  const rootScope = rootScopeWrapped.s

  useEffect(() => {
    const observer: ScopeObserver = {
      handleScopeMutation: (mutation) => {
        setRootScope({ s: rootNode.scope })
      },
    }
    globalMutationDispatcher.registerScopeObserver(observer)
    return () => {
      globalMutationDispatcher.deregisterScopeObserver(observer)
    }
  }, [rootNode])

  return (
    <Accordion allowMultiple defaultIndex={[0]}>
      <AccordionItem border={'none'}>
        {({ isExpanded }) => (
          <>
            <AccordionButton size={'sm'} border={'none'} px={0} py={1}>
              {isExpanded ? <ChevronDownIcon mr={1} /> : <ChevronRightIcon mr={1} />}
              <Text>Variables</Text>
            </AccordionButton>
            <AccordionPanel pl={1} mb={2}>
              <ScopeTree scope={rootScope} startDrag={startDrag} />
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  )
}

interface ScopeTreeProps {
  scope: Scope
  startDrag: (node: NodeBlock, offsetX: number, offsetY: number) => any
}

const ScopeTree = (props: ScopeTreeProps) => {
  const { scope, startDrag } = props
  const varNames = Object.keys(scope.variables)
  const funcNames = Object.keys(scope.functions)
  const scopes = Array.from(scope.childScopes)
  return (
    <>
      {varNames.map((name, idx) => {
        const nodeBlock = getNodeBlock({
          type: 'PY_IDENTIFIER',
          properties: { identifier: name },
          childSets: {},
        })
        return <MicroNode key={name} nodeBlock={nodeBlock} startDrag={startDrag} />
      })}
      {funcNames.map((name, idx) => {
        const nodeBlock = getNodeBlock({
          type: 'PYTHON_CALL_VARIABLE',
          properties: { identifier: name },
          childSets: { arguments: [{ type: 'PYTHON_EXPRESSION', properties: {}, childSets: { tokens: [] } }] },
        })
        return <MicroNode key={name} nodeBlock={nodeBlock} startDrag={startDrag} />
      })}
      {scopes.map((childScope: Scope, idx) => {
        if (!childScope.hasEntries()) {
          return null
        }
        return (
          <>
            <Text textColor={'gray.400'} lineHeight={1.1} py={2} px={1}>
              {childScope.name}
            </Text>
            <ScopeTree key={idx} scope={childScope} startDrag={startDrag} />
          </>
        )
      })}
    </>
  )
}
