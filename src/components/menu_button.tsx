import React from 'react'

import './menu_button.css'

interface ButtonProps {
  disabled: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

interface ButtonState {}

export class MenuButton extends React.Component<ButtonProps, ButtonState> {
  render() {
    const { disabled, onClick, children } = this.props
    return (
      <button className="menu-button" disabled={disabled} onClick={onClick}>
        {children}
      </button>
    )
  }
}
