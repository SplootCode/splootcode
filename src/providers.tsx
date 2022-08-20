import React from 'react'
import { ChakraProvider, ColorModeScript, ThemeConfig, extendTheme } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const colors = {
  gray: {
    50: '#F7FAFC', // Original chakra
    100: '#EDF2F7', // Original chakra
    200: '#F3F5F9', // Sploot neutral 200
    300: '#C8D3E9', // Sploot neutral 300
    400: '#9DAAC1', // Sploot neutral 400
    500: '#5E6C86', // Sploot neutral 500
    600: '#3E4A60', // Sploot neutral 600
    700: '#2F3848', // Sploot neutral 700
    800: '#182134', // Sploot neutral 800
    900: '#040810', // Sploot neutral 900
  },
  iris: {
    50: '#e8e8ff',
    100: '#bdbef8',
    200: '#9293ed',
    300: '#6768e5',
    400: '#3d3ddc',
    500: '#2323c3',
    600: '#1a1b98',
    700: '#12146e',
    800: '#080b44',
    900: '#03031c',
  },
}

const styles = {
  global: {
    body: {
      bg: 'gray.900',
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
