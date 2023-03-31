import React, { useEffect } from 'react'
import { EditorState } from '../context/editor_context'
import { Text, useToast } from '@chakra-ui/react'
import { observer } from 'mobx-react'

interface AutosaveInfoProps {
  editorState: EditorState
  reloadProject: () => void
}

export const AutosaveInfo = observer((props: AutosaveInfoProps) => {
  const toast = useToast()

  const { editorState, reloadProject } = props

  useEffect(() => {
    if (!editorState?.project.isReadOnly) {
      const checkVersion = async () => {
        if (document['hidden'] === false) {
          const isCurrent = await editorState.autosaveWatcher.projectLoader.isCurrentVersion(editorState?.project)
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
  }, [editorState?.project])

  useEffect(() => {
    if (!editorState?.autosaveWatcher?.failedSave) {
      return
    }

    toast({
      title: editorState.autosaveWatcher.failedSaveInfo.title,
      position: 'top',
      status: 'warning',
    })
  }, [editorState?.autosaveWatcher.failedSave])

  if (editorState.project?.isReadOnly || editorState.autosaveWatcher.failedSave) {
    return <Text color={'gray.500'}>{editorState.autosaveWatcher.needsSave ? 'Not saved' : ''}</Text>
  }
  return <Text color={'gray.500'}>{editorState.autosaveWatcher.needsSave ? 'Saving...' : 'Saved'}</Text>
})
