import React, { Fragment, useEffect, useState } from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Box, Text } from '@chakra-ui/react'
import { Category, MicroNode, getSingleNodeFragment } from './category'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { Scope } from '@splootcode/core/language/scope/scope'
import { ScopeObserver } from '@splootcode/core/language/observers'
import { SplootNode } from '@splootcode/core/language/node'
import { TrayCategory } from '@splootcode/core/language/tray/tray'
import { TypeCategory } from '@splootcode/core/language/scope/types'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

import './scope_tray.css'

export interface EntryProps {
  rootNode: SplootNode
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

const AssignmentCategory: TrayCategory = {
  category: 'Assignment',
  entries: [
    {
      key: 'assign',
      abstract: 'Creates new variables with the given name and value.',
      serializedNode: {
        type: 'PYTHON_ASSIGNMENT',
        childSets: { left: [], right: [{ type: 'PYTHON_EXPRESSION', childSets: { tokens: [] }, properties: {} }] },
        properties: {},
      },
      examples: [
        {
          serializedNodes: [
            {
              type: 'PYTHON_ASSIGNMENT',
              childSets: {
                left: [{ type: 'PY_IDENTIFIER', properties: { identifier: 'num' }, childSets: {} }],
                right: [
                  {
                    type: 'PYTHON_EXPRESSION',
                    childSets: {
                      tokens: [
                        {
                          type: 'NUMERIC_LITERAL',
                          properties: { value: '10' },
                          childSets: {},
                        },
                      ],
                    },
                    properties: {},
                  },
                ],
              },
              properties: {},
            },
          ],
          description: '',
        },
      ],
    },
  ],
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
    <Accordion defaultIndex={[0]} allowToggle>
      <AccordionItem border={'none'}>
        {({ isExpanded }) => (
          <>
            <AccordionButton size={'sm'} border={'none'} px={0} py={1}>
              {isExpanded ? <ChevronDownIcon mr={1} /> : <ChevronRightIcon mr={1} />}
              <Text>Variables</Text>
            </AccordionButton>
            <AccordionPanel py={0} pl={2} pr={0}>
              {rootScope.hasEntries() ? (
                <Box borderY={'solid 1px'} borderColor={'gray.600'} py={1}>
                  <Text textColor={'gray.400'} lineHeight={1.1} py={2} px={1}>
                    Global
                  </Text>
                  <ScopeTree scope={rootScope} startDrag={startDrag} />
                </Box>
              ) : null}
              <Category category={AssignmentCategory} startDrag={startDrag} />
            </AccordionPanel>
          </>
        )}
      </AccordionItem>
    </Accordion>
  )
}

interface ScopeTreeProps {
  scope: Scope
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

const ScopeTree = (props: ScopeTreeProps) => {
  const { scope, startDrag } = props

  const allVars = {}
  const allFuncs = {}

  for (const [name, entry] of scope.variables.entries()) {
    let hasVar = false
    let funcSignature = null
    for (const metadata of entry.declarers.values()) {
      if (metadata.typeInfo?.category === TypeCategory.Function) {
        funcSignature = metadata.typeInfo
      } else {
        hasVar = true
      }
    }
    if (hasVar) {
      const nodeBlock = getSingleNodeFragment(
        {
          type: 'PY_IDENTIFIER',
          properties: { identifier: name },
          childSets: {},
        },
        false
      )
      allVars[name] = (
        <div className="scope-tray-entry">
          <MicroNode fragment={nodeBlock} startDrag={startDrag} />
        </div>
      )
    }
    if (funcSignature) {
      const nodeBlock = getSingleNodeFragment(
        {
          type: 'PYTHON_CALL_VARIABLE',
          properties: { identifier: name },
          childSets: {
            arguments: [
              {
                type: 'PYTHON_EXPRESSION',
                properties: {},
                childSets: { tokens: [] },
              },
            ],
          },
        },
        false
      )
      allFuncs[name] = (
        <div className="scope-tray-entry">
          <MicroNode fragment={nodeBlock} startDrag={startDrag} />
        </div>
      )
    }
  }

  const varNames = Object.keys(allVars)
  varNames.sort()
  const funcNames = Object.keys(allFuncs)
  funcNames.sort()

  const scopes = Array.from(scope.childScopes)
  return (
    <>
      {varNames.map((name, idx) => {
        return <React.Fragment key={name}>{allVars[name]}</React.Fragment>
      })}
      {funcNames.map((name, idx) => {
        return <React.Fragment key={name}>{allFuncs[name]}</React.Fragment>
      })}
      {scopes.map((childScope: Scope, idx) => {
        if (!childScope.hasEntries()) {
          return null
        }
        return (
          <Fragment key={idx}>
            <Text textColor={'gray.400'} lineHeight={1.1} py={2} px={1}>
              {childScope.name}
            </Text>
            <ScopeTree scope={childScope} startDrag={startDrag} />
          </Fragment>
        )
      })}
    </>
  )
}
