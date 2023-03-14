import React, { Fragment, useEffect, useState } from 'react'

import { Accordion, AccordionButton, AccordionItem, AccordionPanel, Box, Text } from '@chakra-ui/react'
import { Category, MicroNode, getSingleNodeFragment } from './category'
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons'
import {
  FunctionSignature,
  PythonCallVariable,
  PythonNode,
  PythonScope,
  TypeCategory,
} from '@splootcode/language-python'
import { NodeCategory, ScopeObserver, TrayCategory, globalMutationDispatcher } from '@splootcode/core'
import { RenderedFragment } from '../../layout/rendered_fragment'

import './scope_tray.css'

export interface EntryProps {
  rootNode: PythonNode
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
          serializedNodes: {
            category: NodeCategory.PythonStatementContents,
            nodes: [
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
          },
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
    <Accordion defaultIndex={[0]} allowToggle fontSize={'14px'}>
      <AccordionItem border={'none'}>
        {({ isExpanded }) => (
          <>
            <AccordionButton border={'none'} px={0} py={1} mb={1} fontSize={'14px'} _hover={{ bg: 'gray.700' }}>
              {isExpanded ? (
                <ChevronDownIcon textColor={'gray.300'} mr={0.5} />
              ) : (
                <ChevronRightIcon textColor={'gray.300'} mr={0.5} />
              )}{' '}
              <Text>Variables</Text>
            </AccordionButton>
            <AccordionPanel pt={0} pr={0} pb={1} pl={2} mb={1} ml={2} className={'tray-expanded-category'}>
              {rootScope.hasEntries() ? (
                <Box borderY={'solid 1px'} borderColor={'gray.700'} py={2} mb={2}>
                  <Text textColor={'gray.300'} lineHeight={1.1} py={1} px={1}>
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
  scope: PythonScope
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

const ScopeTree = (props: ScopeTreeProps) => {
  const { scope, startDrag } = props

  const allVars = {}
  const allFuncs = {}

  for (const [name, entry] of scope.variables.entries()) {
    let hasVar = false
    let funcSignature: FunctionSignature = null
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
      const func = new PythonCallVariable(null, name, funcSignature)
      const nodeBlock = getSingleNodeFragment(func.serialize(), false)
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
      {scopes.map((childScope: PythonScope, idx) => {
        if (!childScope.hasEntries()) {
          return null
        }
        return (
          <Box py={2} key={idx}>
            <Text textColor={'gray.400'} lineHeight={1.1} py={1} px={1}>
              {childScope.name}
            </Text>
            <ScopeTree scope={childScope} startDrag={startDrag} />
          </Box>
        )
      })}
    </>
  )
}
