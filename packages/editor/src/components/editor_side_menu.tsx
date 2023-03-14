import './editor_side_menu.css'
import React, { Component } from 'react'
import { BiCog } from 'react-icons/bi'
import { Box, Icon, IconButton, Text } from '@chakra-ui/react'
import { ConfigPanel } from './config_panel'
import { EditorState } from 'src/context/editor_context'
import { RenderedFragment } from 'src/layout/rendered_fragment'
import { Tray } from './tray/tray'

const TRAY_ICON = (
  <svg width="26" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="editor-side-menu-icon">
    <path d="M17.5 1.33366C16.575 1.04199 15.5583 0.916992 14.5833 0.916992C12.9583 0.916992 11.2083 1.25033 10 2.16699C8.79166 1.25033 7.04167 0.916992 5.41667 0.916992C3.79167 0.916992 2.04167 1.25033 0.833332 2.16699V14.3753C0.833332 14.5837 1.04167 14.792 1.25 14.792C1.33333 14.792 1.375 14.7503 1.45833 14.7503C2.58333 14.2087 4.20833 13.8337 5.41667 13.8337C7.04167 13.8337 8.79166 14.167 10 15.0837C11.125 14.3753 13.1667 13.8337 14.5833 13.8337C15.9583 13.8337 17.375 14.0837 18.5417 14.7087C18.625 14.7503 18.6667 14.7503 18.75 14.7503C18.9583 14.7503 19.1667 14.542 19.1667 14.3337V2.16699C18.6667 1.79199 18.125 1.54199 17.5 1.33366ZM17.5 12.5837C16.5833 12.292 15.5833 12.167 14.5833 12.167C13.1667 12.167 11.125 12.7087 10 13.417V3.83366C11.125 3.12533 13.1667 2.58366 14.5833 2.58366C15.5833 2.58366 16.5833 2.70866 17.5 3.00033V12.5837Z" />
    <path d="M14.5833 5.91699C15.3167 5.91699 16.025 5.99199 16.6667 6.13366V4.86699C16.0083 4.74199 15.3 4.66699 14.5833 4.66699C13.1667 4.66699 11.8833 4.90866 10.8333 5.35866V6.74199C11.775 6.20866 13.0833 5.91699 14.5833 5.91699Z" />
    <path d="M10.8333 7.57533V8.95866C11.775 8.42533 13.0833 8.13366 14.5833 8.13366C15.3167 8.13366 16.025 8.20866 16.6667 8.35033V7.08366C16.0083 6.95866 15.3 6.88366 14.5833 6.88366C13.1667 6.88366 11.8833 7.13366 10.8333 7.57533Z" />
    <path d="M14.5833 9.10866C13.1667 9.10866 11.8833 9.35033 10.8333 9.80033V11.1837C11.775 10.6503 13.0833 10.3587 14.5833 10.3587C15.3167 10.3587 16.025 10.4337 16.6667 10.5753V9.30866C16.0083 9.17533 15.3 9.10866 14.5833 9.10866Z" />
  </svg>
)

export type EditorSideMenuView = 'tray' | 'config' | ''

export interface EditorSideMenuProps {
  onChangeView: (newView: EditorSideMenuView) => void
  currentView: string
}

export class EditorSideMenu extends Component<EditorSideMenuProps> {
  render() {
    const { currentView } = this.props

    const handleClick = (viewName: EditorSideMenuView) => {
      if (viewName === currentView) {
        this.props.onChangeView('')
        return
      }
      this.props.onChangeView(viewName)
    }

    return (
      <div className="editor-side-menu-bar">
        <div className={'editor-side-menu-container ' + (currentView === 'tray' ? 'editor-side-menu-selected' : '')}>
          <IconButton
            aria-label="Library"
            size="sm"
            padding={1}
            width="100%"
            height={10}
            borderRadius={0}
            variant={'ghost'}
            onClick={() => handleClick('tray')}
            color={currentView === 'tray' ? 'gray.200' : 'gray.400'}
            icon={TRAY_ICON}
          ></IconButton>
        </div>
        <div className={'editor-side-menu-container ' + (currentView === 'config' ? 'editor-side-menu-selected' : '')}>
          <IconButton
            aria-label="Configuration"
            size="sm"
            padding={1}
            width="100%"
            height={10}
            borderRadius={0}
            variant={'ghost'}
            onClick={() => handleClick('config')}
            color={currentView === 'config' ? 'gray.200' : 'gray.400'}
            icon={<Icon as={BiCog} boxSize={7} />}
          ></IconButton>
        </div>
      </div>
    )
  }
}

export interface EditorSideMenuPaneProps {
  editorState: EditorState
  visibleView: 'tray' | 'config' | ''
}

export class EditorSideMenuPane extends Component<EditorSideMenuPaneProps> {
  render() {
    const { editorState, visibleView } = this.props
    const project = editorState.project
    const fileBlock = editorState.rootNode
    const trayState = visibleView === 'tray' ? {} : { display: 'none' }
    const configState = visibleView === 'config' ? {} : { display: 'none' }
    const title = { tray: 'Library', config: 'Configuration' }[visibleView]
    return (
      <>
        <div style={trayState} className="editor-side-menu">
          <Box px={3} py={3} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
            <Text as={'h2'} color="gray.100">
              {title}
            </Text>
          </Box>
          <Tray key={fileBlock.node.type} startDrag={this.startDrag} rootNode={fileBlock.node} />
        </div>
        <div style={configState} className="editor-side-menu">
          <Box px={3} py={3} borderBottomColor={'gray.800'} borderBottomWidth={'2px'}>
            <Text as={'h2'} color="gray.100">
              {title}
            </Text>
          </Box>
          <ConfigPanel project={project} startDrag={this.startDrag} />
        </div>
      </>
    )
  }

  startDrag = (fragment: RenderedFragment, offsetX: number, offestY: number) => {
    this.props.editorState.selection.startDrag(fragment, offsetX, offestY)
  }
}
