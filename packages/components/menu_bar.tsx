import './menu_bar.css'
import React from 'react'
import { Link } from 'react-router-dom'

export interface MenuBarProps {
  children?: React.ReactNode
}

export const MenuBarItem = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  return <div className="menubar-item">{children}</div>
}

export const MenuBar = ({ children }: MenuBarProps): React.ReactElement => {
  return (
    <nav id="menubar">
      <div className="menubar-left">
        <MenuBarItem>
          <Link to="/">Home</Link>
        </MenuBarItem>
        {children}
      </div>
    </nav>
  )
}
