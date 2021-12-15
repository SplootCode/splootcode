import React, { MutableRefObject } from 'react'
import { observer } from 'mobx-react'
import { Spreadsheet, DataEditor } from 'react-spreadsheet'
import { DataSheetState } from '../../context/editor_context'
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Popover,
  PopoverArrow,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import { AddIcon } from '@chakra-ui/icons'
import { SplootDataFieldDeclaration } from '@splootcode/core/language/types/dataset/field_declaration'
import { SplootDataRow } from '@splootcode/core/language/types/dataset/row'

interface TextInputProps {
  id: string
  label: string
  defaultValue: string
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
  return (
    <FormControl>
      <FormLabel htmlFor={props.id}>{props.label}</FormLabel>
      <Input ref={ref} id={props.id} {...props} />
    </FormControl>
  )
})

type FormProps = {
  firstFieldRef: React.RefObject<any>
  onCancel: () => void
  onSave: (newColumnName: string) => void
}

const Form = ({ firstFieldRef, onCancel, onSave }: FormProps) => {
  const ref = firstFieldRef as MutableRefObject<HTMLInputElement>
  return (
    <Stack spacing={4}>
      <TextInput label="Column name" id="column-name" ref={firstFieldRef} defaultValue="New Column" />
      <ButtonGroup d="flex" justifyContent="flex-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button colorScheme="teal" onClick={() => onSave(ref.current.value)}>
          Add
        </Button>
      </ButtonGroup>
    </Stack>
  )
}

const AddColumnForm = ({ addColumn }: { addColumn: (newColumnName: string) => void }) => {
  const { onOpen, onClose, isOpen } = useDisclosure()
  const firstFieldRef = React.useRef(null)

  return (
    <Popover
      isOpen={isOpen}
      initialFocusRef={firstFieldRef}
      onOpen={onOpen}
      onClose={onClose}
      placement="right"
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <Button size="xs" colorScheme="gray" variant="outline" leftIcon={<AddIcon fontSize={8} />} mt={0.5}>
          Column
        </Button>
      </PopoverTrigger>
      <PopoverContent p={5}>
        <PopoverArrow />
        <PopoverCloseButton />
        <Form
          firstFieldRef={firstFieldRef}
          onCancel={onClose}
          onSave={(newColumnName: string) => {
            addColumn(newColumnName)
            onClose()
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DataSheetEditorProps {
  dataSheetState: DataSheetState
}

@observer
export class DataSheetEditor extends React.Component<DataSheetEditorProps> {
  render() {
    const { dataSheetState } = this.props
    const sheetNode = dataSheetState.dataSheetNode
    const fields = sheetNode.getFieldDeclarations()
    const columnLabels = fields.map((fieldDec) => fieldDec.getName())
    const columnIds = fields.map((fieldDec) => fieldDec.getKey())

    const SplootCellEditor = (props) => {
      const onEdit = (event) => {
        const fieldName = columnIds[props.column]
        const dataRow = sheetNode.getRows()[props.row] as SplootDataRow
        dataRow.setValue(fieldName, event.value)
        props.onChange(event)
      }
      return <DataEditor {...props} onChange={onEdit} />
    }

    const data = dataSheetState.dataSheetNode.getRows().map((row) => {
      return row.getValuesAsList(columnIds)
    })

    return (
      <>
        <Box borderWidth="1px" borderRadius="lg" m={2} p={2}>
          <HStack>
            <FormLabel htmlFor="variable" size="sm" fontWeight="normal" m={0.5}>
              Export as variable
            </FormLabel>
            <Input
              type="text"
              name="variable"
              size="sm"
              width={24}
              defaultValue={sheetNode.getName()}
              onChange={this.setVariableName}
            />
          </HStack>
        </Box>
        <HStack align="start">
          <Spreadsheet data={data} columnLabels={columnLabels} DataEditor={SplootCellEditor} />
          <Box>
            <AddColumnForm addColumn={this.addColumn} />
          </Box>
        </HStack>
        <Box>
          <Button
            size="xs"
            colorScheme="gray"
            variant="outline"
            leftIcon={<AddIcon fontSize={8} />}
            mt={0.5}
            onClick={this.addRow}
          >
            Row
          </Button>
        </Box>
      </>
    )
  }

  setVariableName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { dataSheetState } = this.props
    dataSheetState.dataSheetNode.setName(event.target.value)
  }

  addRow = () => {
    const { dataSheetState } = this.props
    dataSheetState.dataSheetNode.addRow()
  }

  addColumn = (name: string) => {
    const { dataSheetState } = this.props
    const node = dataSheetState.dataSheetNode
    const existingKeys = new Set<string>()
    node.getFieldDeclarations().forEach((dec) => {
      existingKeys.add(dec.getKey())
    })
    let key = ''
    let unique = false
    let count = 0
    let length = 3
    while (!unique) {
      if (count > 10) {
        length += 1
        count = 0
      }
      key = generateRandomKey(length)
      unique = !existingKeys.has(key)
      count += 1
    }
    const dec = new SplootDataFieldDeclaration(null, key, name)
    node.addFieldDeclaration(dec)
  }
}

function generateRandomKey(length: number) {
  let result = 'k' // make sure it starts with a letter
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
