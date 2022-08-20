import React, { useEffect, useState } from 'react'

import { Button, Flex, Text } from '@chakra-ui/react'
import { ChildSetMutation } from '@splootcode/core/language/mutations/child_set_mutations'
import { NodeMutation } from '@splootcode/core/language/mutations/node_mutations'
import { Project } from '@splootcode/core/language/projects/project'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

export function EditorBanner(props: { project: Project; onSaveAs: () => void }) {
  const { project, onSaveAs } = props
  const [mutationCount, setMutationCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!dismissed) {
      const mutationObserver = {
        handleNodeMutation: (mutation: NodeMutation) => {
          setMutationCount((count) => count + 1)
        },
        handleChildSetMutation: (mutation: ChildSetMutation) => {
          setMutationCount((count) => count + 1)
        },
      }
      globalMutationDispatcher.registerChildSetObserver(mutationObserver)
      globalMutationDispatcher.registerNodeObserver(mutationObserver)
      const cleanup = () => {
        globalMutationDispatcher.deregisterNodeObserver(mutationObserver)
        globalMutationDispatcher.deregisterChildSetObserver(mutationObserver)
      }
      return cleanup
    }
  }, [project, dismissed])

  if (mutationCount < 3 || dismissed) {
    return null
  }

  return (
    <Flex bgColor={'blue.900'} justifyContent="center" alignItems={'baseline'}>
      <Text mx={1}>This is an example, make a copy to save your progress.</Text>
      <Button onClick={() => onSaveAs()} variant="solid" colorScheme={'blue'} size="sm" m={1} px={3}>
        Save
      </Button>{' '}
      <Button onClick={() => setDismissed(true)} size="sm" m={1}>
        Dismiss
      </Button>
    </Flex>
  )
}
