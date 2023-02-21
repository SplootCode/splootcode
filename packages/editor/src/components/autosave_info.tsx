import React from 'react'
import { AutosaveWatcher } from '../context/autosave_watcher'
import { Project } from '@splootcode/core'
import { Text } from '@chakra-ui/react'
import { observer } from 'mobx-react'

interface AutosaveInfoProps {
  project: Project
  autosave: AutosaveWatcher
}

@observer
export class AutosaveInfo extends React.Component<AutosaveInfoProps> {
  render() {
    if (this.props.project?.isReadOnly || this.props.autosave.failedSave) {
      return <Text color={'gray.500'}>{this.props.autosave.needsSave ? 'Not saved' : ''}</Text>
    }
    return <Text color={'gray.500'}>{this.props.autosave.needsSave ? 'Saving...' : 'Saved'}</Text>
  }
}
