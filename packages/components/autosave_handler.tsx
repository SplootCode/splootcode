import React, { useEffect, useState } from 'react'
import { ChildSetMutation } from '@splootcode/core/language/mutations/child_set_mutations'
import { NodeMutation } from '@splootcode/core/language/mutations/node_mutations'
import { Project } from '@splootcode/core/language/projects/project'
import { SaveError } from '@splootcode/core/language/projects/file_loader'
import { Text, useToast } from '@chakra-ui/react'
import { globalMutationDispatcher } from '@splootcode/core/language/mutations/mutation_dispatcher'

export const AutosaveHandler = (props: { project: Project }) => {
  const { project } = props

  const [needsSave, setNeedsSave] = useState(false)
  const [failedSave, setFailedSave] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (needsSave && !project?.isReadOnly) {
      const id = setTimeout(() => {
        if (needsSave) {
          project
            .save()
            .then((success) => {
              if (success) {
                setNeedsSave(false)
                setFailedSave(false)
              } else {
                setFailedSave(true)
              }
            })
            .catch((err) => {
              if (err instanceof SaveError) {
                toast({
                  title: err.message,
                  position: 'top',
                  status: 'warning',
                })
                setFailedSave(true)
              } else {
                throw err
              }
            })
        }
      }, 2000)
      return () => {
        clearTimeout(id)
      }
    }
  }, [needsSave, project])

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

  if (project?.isReadOnly || failedSave) {
    return <Text color={'gray.500'}>{needsSave ? 'Not saved' : ''}</Text>
  }
  return <Text color={'gray.500'}>{needsSave ? 'Saving...' : 'Saved'}</Text>
}
