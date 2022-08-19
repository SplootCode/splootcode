import React, { useEffect, useState } from 'react'
import { Box, Button, Text, useToast } from '@chakra-ui/react'
import { ChildSetMutation } from '@splootcode/core/language/mutations/child_set_mutations'
import { NodeMutation } from '@splootcode/core/language/mutations/node_mutations'
import { Project } from '@splootcode/core/language/projects/project'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

function SavePrompt(props: { onNoSave: () => void; onSaveAs: () => void }) {
  return (
    <Box color="white" p={3} bg="blue.500">
      Would you like to save changes?
      <Button variant={'ghost'} onClick={props.onNoSave}>
        Continue without saving
      </Button>
      <Button variant={'solid'} onClick={props.onSaveAs}>
        Save
      </Button>
    </Box>
  )
}

export const AutosaveHandler = (props: { project: Project; onSaveAs: () => void }) => {
  const { project, onSaveAs } = props

  const [needsSave, setNeedsSave] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (needsSave && project.isReadOnly) {
      const toastID = toast({
        position: 'top',
        isClosable: true,
        duration: null,
        render: () => (
          <SavePrompt
            onNoSave={() => toast.close(toastID)}
            onSaveAs={() => {
              toast.close(toastID)
              onSaveAs()
            }}
          />
        ),
      })
    }
    if (needsSave && !project?.isReadOnly) {
      setTimeout(() => {
        if (needsSave) {
          project.save()
          setNeedsSave(false)
        }
      }, 2000)
    }
  }, [needsSave])

  useEffect(() => {
    const mutationObserver = {
      handleNodeMutation: (mutation: NodeMutation) => {
        setNeedsSave(true)
      },
      handleChildSetMutation: (mutation: ChildSetMutation) => {
        setNeedsSave(true)
      },
    }
    globalMutationDispatcher.registerChildSetObserver(mutationObserver)
    globalMutationDispatcher.registerNodeObserver(mutationObserver)
    const cleanup = () => {
      globalMutationDispatcher.deregisterNodeObserver(mutationObserver)
      globalMutationDispatcher.deregisterChildSetObserver(mutationObserver)
    }
    return cleanup
  }, [project])

  if (project?.isReadOnly) {
    return (
      <>
        <Text color={'gray.500'}>{needsSave ? 'Use "Save As..." to save your changes to a new project' : ''}</Text>
      </>
    )
  }
  return <Text color={'gray.500'}>{needsSave ? 'Saving...' : 'Saved'}</Text>
}
