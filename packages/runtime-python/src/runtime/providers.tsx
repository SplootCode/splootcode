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
}

const styles = {
  global: {
    body: {
      bg: 'gray.900',
      fontFamily: 'Karla',
    },
  },
}

const theme = extendTheme({ config, colors, styles })

export const AppProviders: React.FC = ({ children }) => (
  <ChakraProvider theme={theme} resetCSS={true}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    {children}
  </ChakraProvider>
)
