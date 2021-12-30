import './menu_bar.css'
import React from 'react'
import { HamburgerIcon } from '@chakra-ui/icons'
import { IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

export interface MainMenuItem {
  name: string
  disabled?: boolean
  onClick: () => void
}

export interface MenuBarProps {
  children?: React.ReactNode
  menuItems: MainMenuItem[]
}

export const MenuBarItem = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  return <div className="menubar-item">{children}</div>
}

export const MenuBar = ({ children, menuItems }: MenuBarProps): React.ReactElement => {
  return (
    <nav id="menubar">
      <div className="menubar-left">
        <Menu>
          <MenuButton
            aria-label="Options"
            as={IconButton}
            icon={<HamburgerIcon />}
            variant="ghost"
            size={'sm'}
            fontSize={'md'}
            p={1}
          ></MenuButton>
          <MenuList>
            {menuItems.map((menuItem) => {
              return (
                <MenuItem key={menuItem.name} onClick={menuItem.onClick} isDisabled={menuItem.disabled}>
                  {menuItem.name}
                </MenuItem>
              )
            })}
          </MenuList>
        </Menu>
        <MenuBarItem>
          <Link to="/">Home</Link>
        </MenuBarItem>
        {children}
      </div>
    </nav>
  )
}
