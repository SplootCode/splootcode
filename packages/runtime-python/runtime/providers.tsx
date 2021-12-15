import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import React from 'react'

const config = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const styles = {
  global: (props) => ({
    body: {
      // Override the chakra default dark mode background color to match editor.css
      bg: mode('whiteAlpha.900', '#13171b')(props),
    },
  }),
}

const theme = extendTheme({ config, styles })

export const AppProviders: React.FC = ({ children }) => (
  <ChakraProvider theme={theme} resetCSS={true}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    {children}
  </ChakraProvider>
)
