import 'tslib'

import React from 'react'
import ReactDOM from 'react-dom'
import {ColorModeScript, ChakraProvider, extendTheme} from '@chakra-ui/react';
import { mode } from "@chakra-ui/theme-tools"

import {App} from './app';
import "focus-visible/dist/focus-visible"


const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const styles = {
  global: props => ({
    body: {
      // Override the chakra default dark mode background color to match editor.css
      bg: mode("whiteAlpha.900", "#13171b")(props),
    },
  }),
}

export const theme = extendTheme({ config, styles });

const root = document.getElementById('app-root')

ReactDOM.render(
  <ChakraProvider theme={theme} resetCSS={true}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <App />
  </ChakraProvider>, root)
