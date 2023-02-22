import React from 'react'
import { EditorState } from 'src/context/editor_context'
import { Text } from '@chakra-ui/react'
import { observer } from 'mobx-react'

interface AutosaveInfoProps {
  editorState: EditorState
}

@observer
export class AutosaveInfo extends React.Component<AutosaveInfoProps> {
  render() {
    const { editorState } = this.props

    if (editorState.project?.isReadOnly || editorState.autosaveWatcher.failedSave) {
      return <Text color={'gray.500'}>{editorState.autosaveWatcher.needsSave ? 'Not saved' : ''}</Text>
    }
    return <Text color={'gray.500'}>{editorState.autosaveWatcher.needsSave ? 'Saving...' : 'Saved'}</Text>
  }
}
