import React, { useEffect, useState } from 'react'
import {
  ChildSetMutation,
  NodeMutation,
  Project,
  ProjectLoader,
  SaveError,
  globalMutationDispatcher,
} from '@splootcode/core'
import { Text, useToast } from '@chakra-ui/react'

export const AutosaveHandler = (props: {
  project: Project
  projectLoader: ProjectLoader
  reloadProject: () => void
}) => {
  const { project, projectLoader, reloadProject } = props

  const [needsSave, setNeedsSave] = useState(false)
  const [failedSave, setFailedSave] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (needsSave && !project?.isReadOnly) {
      const id = setTimeout(() => {
        if (needsSave) {
          projectLoader
            .saveProject(project)
            .then((success) => {
              if (success) {
                setNeedsSave(false)
                setFailedSave(false)
              } else {
                setFailedSave(true)
                toast({
                  title: 'Failed to save. Reason: Unknown',
                  position: 'top',
                  status: 'warning',
                })
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

  useEffect(() => {
    if (!needsSave && !project?.isReadOnly) {
      const checkVersion = async () => {
        if (document['hidden'] === false) {
          const isCurrent = await projectLoader.isCurrentVersion(project)
          if (!isCurrent) {
            reloadProject()
          }
        }
      }
      window.addEventListener('visibilitychange', checkVersion)
      return () => {
        window.removeEventListener('visibilitychange', checkVersion)
      }
    }
  }, [needsSave, project])

  if (project?.isReadOnly || failedSave) {
    return <Text color={'gray.500'}>{needsSave ? 'Not saved' : ''}</Text>
  }
  return <Text color={'gray.500'}>{needsSave ? 'Saving...' : 'Saved'}</Text>
}
