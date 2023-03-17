import React from 'react'
import { AiOutlineClockCircle } from 'react-icons/ai'
import { FiTerminal } from 'react-icons/fi'
import { Icon } from '@chakra-ui/react'
import { RunType } from '@splootcode/core'
import { SiAiohttp } from 'react-icons/si'

export function RunTypeIcon(props: { runType: RunType }) {
  switch (props.runType) {
    case RunType.COMMAND_LINE:
      return <Icon as={FiTerminal} boxSize={6} backgroundColor="pink.700" p={1} borderRadius={3} />
    case RunType.HTTP_REQUEST:
      return <Icon as={SiAiohttp} boxSize={6} backgroundColor="blue.700" p={1} borderRadius={3} />
    case RunType.SCHEDULE:
      return <Icon as={AiOutlineClockCircle} boxSize={6} backgroundColor="teal.700" p={1} borderRadius={3} />
    default:
      return <Icon boxSize={6} backgroundColor="gray.800" p={1} borderRadius={3} />
  }
}