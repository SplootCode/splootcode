import './insert_box.css'

import Fuse from 'fuse.js'
import React from 'react'
import { observer } from 'mobx-react'

import { Autocompleter } from '@splootcode/core/language/autocomplete/autocompleter'
import { EditorNodeBlock } from './node_block'
import { InsertBoxData } from '../context/insert_box'
import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory, getAutocompleRegistry } from '@splootcode/core/language/node_category_registry'
import { NodeSelection, NodeSelectionState, SelectionState } from '../context/selection'
import { ParentReference } from '@splootcode/core/language/node'
import { RenderedChildSetBlock, stringWidth } from '../layout/rendered_childset_block'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'

interface RenderedSuggestion extends SuggestedNode {
  nodeBlock: NodeBlock
}

function renderSuggestion(suggestedNode: SuggestedNode): RenderedSuggestion {
  const rendered = suggestedNode as RenderedSuggestion
  rendered.nodeBlock = new NodeBlock(null, suggestedNode.node, null, 0)
  rendered.nodeBlock.calculateDimensions(0, 0, null)
  return rendered
}

function filterSuggestions(
  parentRef: ParentReference,
  index: number,
  staticSuggestions: RenderedSuggestion[],
  autocompleter: Autocompleter,
  userInput: string
): RenderedSuggestion[] {
  const prefixSuggestions = autocompleter.getPrefixSuggestions(parentRef, index, userInput)
  if (prefixSuggestions) {
    return prefixSuggestions.map(renderSuggestion)
  }

  const suggestions = [
    ...staticSuggestions,
    ...autocompleter.getDynamicSuggestions(parentRef, index, userInput).map(renderSuggestion),
  ]
  const options: Fuse.FuseOptions<SuggestedNode> = {
    keys: ['key', 'display', 'searchTerms'],
    caseSensitive: false,
  }
  const fuse = new Fuse(suggestions, options)
  const results = fuse.search(userInput) as RenderedSuggestion[]
  return results
}

interface InsertBoxState {
  userInput: string
  autoWidth: number
  filteredSuggestions: RenderedSuggestion[]
  staticSuggestions: RenderedSuggestion[]
  autocompleter: Autocompleter
  activeSuggestion: number
  category: NodeCategory
  index: number
  listBlock: RenderedChildSetBlock
}

interface InsertBoxProps {
  editorX: number
  editorY: number
  insertBoxData: InsertBoxData
  selection: NodeSelection
}

@observer
export class InsertBox extends React.Component<InsertBoxProps, InsertBoxState> {
  private inputRef: React.RefObject<HTMLInputElement>

  constructor(props: InsertBoxProps) {
    super(props)
    this.inputRef = React.createRef()
    const { selection } = props
    const childSetBlock = selection.cursor.listBlock
    const index = selection.cursor.index
    const category = childSetBlock.childSet.nodeCategory
    const parentRef = childSetBlock.childSet.getParentRef()
    const autocompleter = getAutocompleRegistry().getAutocompleter(category)
    const staticSuggestions: RenderedSuggestion[] = autocompleter
      .getStaticSuggestions(parentRef, index)
      .map(renderSuggestion)

    const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, autocompleter, '')

    this.state = {
      userInput: '',
      autoWidth: this.getWidth(''),
      filteredSuggestions: filteredSuggestions,
      autocompleter: autocompleter,
      staticSuggestions: staticSuggestions,
      activeSuggestion: 0,
      category: category,
      index: index,
      listBlock: childSetBlock,
    }
  }

  static getDerivedStateFromProps(props: InsertBoxProps, state: InsertBoxState) {
    const { selection } = props
    const childSetBlock = selection.cursor.listBlock
    const index = selection.cursor.index
    const category = childSetBlock.childSet.nodeCategory
    if (category !== state.category || index !== state.index || childSetBlock !== state.listBlock) {
      const parentRef = childSetBlock.childSet.getParentRef()
      const autocompleter = getAutocompleRegistry().getAutocompleter(category)
      const staticSuggestions: RenderedSuggestion[] = autocompleter
        .getStaticSuggestions(parentRef, index)
        .map(renderSuggestion)

      const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, autocompleter, state.userInput)
      return {
        filteredSuggestions: filteredSuggestions,
        staticSuggestions: staticSuggestions,
        activeSuggestion: 0,
        autocompleter: autocompleter,
        category: category,
        index: index,
        listBlock: childSetBlock,
      }
    }
    return null
  }

  componentDidUpdate(prevProps: Readonly<InsertBoxProps>, prevState: Readonly<InsertBoxState>, snapshot?: any): void {
    this.inputRef.current.focus()
  }

  render() {
    const { userInput, autoWidth, filteredSuggestions, activeSuggestion } = this.state
    const { selection, insertBoxData } = this.props
    const isInserting = selection.state === SelectionState.Inserting

    let suggestionsListComponent: JSX.Element
    if (selection.state === SelectionState.Inserting) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <ul className="autocomplete-suggestions">
            {filteredSuggestions.map((suggestion, index) => {
              let className = ''

              // Flag the active suggestion with a class
              if (index === activeSuggestion) {
                className = 'autocomplete-suggestion-active'
              }

              if (!suggestion.valid) {
                className += ' invalid'
              }

              return (
                <li className={className} key={suggestion.key} onClick={this.onClickSuggestion(suggestion)}>
                  <svg
                    className="autocomplete-inline-svg"
                    height={suggestion.nodeBlock.rowHeight}
                    width={suggestion.nodeBlock.rowWidth + 2}
                  >
                    <EditorNodeBlock
                      block={suggestion.nodeBlock}
                      selection={null}
                      selectionState={NodeSelectionState.UNSELECTED}
                    />
                  </svg>
                  <span className="autocomplete-description">{suggestion.description}</span>
                </li>
              )
            })}
          </ul>
        )
      } else {
        suggestionsListComponent = null
      }
    }

    const { editorX, editorY } = this.props
    const { x, y } = insertBoxData
    let positionStyles: React.CSSProperties
    if (isInserting) {
      positionStyles = {
        position: 'absolute',
        left: x + editorX + 'px',
        top: y + editorY + 1 + 'px',
      }
    } else {
      positionStyles = {
        position: 'absolute',
        left: x + editorX - 2 + 'px',
        top: y + editorY + 1 + 'px',
      }
    }

    return (
      <div style={positionStyles}>
        <div className={isInserting ? 'input-box' : 'hidden-input-box'}>
          <input
            autoComplete="off"
            autoFocus
            type="text"
            id="insertbox"
            ref={this.inputRef}
            defaultValue={userInput}
            onChange={this.onChange}
            onClick={this.onClick}
            onKeyDown={this.onKeyDown}
            onKeyPress={this.onKeyPress}
            onBlur={this.onBlur}
            style={{ width: autoWidth }}
          />
        </div>
        {suggestionsListComponent}
      </div>
    )
  }

  onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      return false
    }
  }

  isOpenString = (inp: string) => {
    if (inp.startsWith("'") || inp.startsWith('"')) {
      return inp.length == 1 || inp[0] !== inp[inp.length - 1]
    }
    return false
  }

  onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { selection } = this.props

    if (selection.state === SelectionState.Cursor) {
      if (e.key === 'Enter') {
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        selection.insertNewlineOrUnindent()
      } else if (e.key === 'Backspace') {
        // If the cursor position lands on a selected node after delete
        // then the editor level backspace handling kicks in.
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        selection.backspace()
      }
      return
    }

    const { activeSuggestion, filteredSuggestions } = this.state

    // Escape
    if (e.key === 'Escape') {
      this.inputRef.current.value = ''
      selection.exitEdit()
      e.stopPropagation()
    }

    // Enter or space key
    if (e.key === 'Enter' || (e.key === ' ' && !this.isOpenString(this.state.userInput))) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      const selectedNode = filteredSuggestions[activeSuggestion]
      if (selectedNode !== undefined) {
        this.setState({
          activeSuggestion: 0,
        })
        this.onSelected(selectedNode)
      }
    }
    // User pressed the up arrow, decrement the index
    else if (e.key === 'ArrowUp' && filteredSuggestions.length > 0) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      if (activeSuggestion === 0) {
        return
      }

      this.setState({ activeSuggestion: activeSuggestion - 1 })
    }
    // User pressed the down arrow, increment the index
    else if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      if (activeSuggestion === filteredSuggestions.length - 1) {
        return
      }

      this.setState({ activeSuggestion: activeSuggestion + 1 })
    }

    // Don't move the node cursor, just let the text box do its thing for left/right arrows.
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
    }
  }

  onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const selection = this.props.selection
    if (selection.state === SelectionState.Cursor) {
      selection.clearSelection()
    }
  }

  getWidth = (input: string) => {
    return stringWidth(input) + 6
  }

  onClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // e.stopPropagation();
  }

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === ' ') {
      e.currentTarget.value = ''
    }
    const userInput = e.currentTarget.value
    if (userInput !== '') {
      const { staticSuggestions, autocompleter } = this.state
      const childSetBlock = this.props.selection.cursor.listBlock
      const index = this.props.selection.cursor.index

      const parentRef = childSetBlock.childSet.getParentRef()
      const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, autocompleter, userInput)
      this.props.selection.startInsertAtCurrentCursor()
      this.setState({
        userInput: e.currentTarget.value,
        activeSuggestion: 0,
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: filteredSuggestions,
      })
    } else {
      this.setState({
        userInput: '',
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: [],
        activeSuggestion: 0,
      })
    }
  }

  onSelected(suggestion: SuggestedNode) {
    const { selection } = this.props
    const childSetBlock = selection.cursor.listBlock
    const index = selection.cursor.index
    const node = suggestion.node.clone()
    if (suggestion.hasOverrideLocation()) {
      if (suggestion.wrapChildSetId) {
        selection.wrapNode(
          suggestion.overrideLocationChildSet,
          suggestion.overrideLocationIndex,
          node,
          suggestion.wrapChildSetId
        )
      } else {
        selection.insertNodeByChildSet(suggestion.overrideLocationChildSet, suggestion.overrideLocationIndex, node)
      }
    } else if (suggestion.wrapChildSetId) {
      selection.wrapNode(childSetBlock.childSet, index - 1, node, suggestion.wrapChildSetId)
    } else {
      selection.insertNode(childSetBlock, index, node)
    }
    this.inputRef.current.value = ''
  }

  // Event fired when the user clicks on a suggestion
  onClickSuggestion = (suggestion: SuggestedNode) => {
    return (e: React.MouseEvent<HTMLLIElement>) => {
      // Update the user input and reset the rest of the state
      this.setState({
        activeSuggestion: 0,
        filteredSuggestions: [],
      })
      this.onSelected(suggestion)
    }
  }
}
