import React from 'react'
import { ChakraProvider, ColorModeScript, ThemeConfig, extendTheme } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const colors = {
  gray: {
    50: '#e8f3ff',
    100: '#cfd7e4',
    200: '#b3bccd',
    300: '#95a1b6',
    400: '#7886a0',
    500: '#5f6d87',
    600: '#49556a',
    700: '#343c4d',
    800: '#1e2431',
    850: '#09101b',
    900: '#060b14',
  },
}

const styles = {
  global: {
    body: {
      bg: 'gray.850',
    },
  },
}
const fonts = {
  heading: 'Karla',
  body: 'Karla',
}

const theme = extendTheme({ config, colors, styles, fonts })

export const AppProviders: React.FC = ({ children }) => (
  <ChakraProvider theme={theme} resetCSS={true}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    {children}
  </ChakraProvider>
)
