import React from 'react'
import { ChakraProvider, ColorModeScript, ThemeConfig, extendTheme } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const colors = {
  gray: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#585f6c', // "#4A5568"
    700: '#303641', // "#2D3748",
    800: '#1f2227', // "#1A202C",
    900: '#1a1c1f', // "#171923", Must also be copied to terminal background setting manually
  },
}

const theme = extendTheme({ config, colors })

export const AppProviders: React.FC = ({ children }) => (
  <ChakraProvider theme={theme} resetCSS={true}>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    {children}
  </ChakraProvider>
)
