import React from 'react'
import { Box, Container, Grid, Heading, VStack } from '@chakra-ui/layout'
import { Link } from 'react-router-dom'
import { MenuBar } from '@splootcode/components/menu_bar'

export class UserHomePage extends React.Component {
  render() {
    return (
      <React.Fragment>
        <MenuBar></MenuBar>
        <Container maxW="container.md" paddingTop={8}>
          <VStack align="stretch" spacing={8}>
            <Box>
              <Heading as="h2" size="md" marginBottom={2}>
                Examples
              </Heading>
              <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={4}>
                <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                  <Link to="/p/examples/helloname">
                    <Box p="6">Hello Name</Box>
                  </Link>
                </Box>
                <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                  <Link to="/p/examples/temperature_conversion">
                    <Box p="6">Temperature Conversion</Box>
                  </Link>
                </Box>
                <Box borderWidth="1px" borderRadius="md" bg="gray.700">
                  <Link to="/p/examples/secret_password">
                    <Box p="6">Secret password</Box>
                  </Link>
                </Box>
              </Grid>
            </Box>
          </VStack>
        </Container>
      </React.Fragment>
    )
  }
}
