import './insert_box.css'

import Fuse from 'fuse.js'
import React from 'react'
import { observer } from 'mobx-react'

import { Autocompleter } from '@splootcode/core/language/autocomplete/autocompleter'
import { ChildSet } from '@splootcode/core/language/childset'
import { CursorPosition, NodeCursor, NodeSelection, NodeSelectionState, SelectionState } from '../context/selection'
import { EditorNodeBlock } from './node_block'
import { InsertBoxData } from '../context/insert_box'
import { NodeBlock } from '../layout/rendered_node'
import { NodeCategory, getAutocompleRegistry } from '@splootcode/core/language/node_category_registry'
import { ParentReference } from '@splootcode/core/language/node'
import { SuggestedNode } from '@splootcode/core/language/autocomplete/suggested_node'
import { stringWidth } from '../layout/rendered_childset_block'

interface RenderedSuggestion extends SuggestedNode {
  nodeBlock: NodeBlock
  childSet: ChildSet
  index: number
}

function filterSuggestions(
  staticSuggestions: RenderedSuggestion[],
  autocompleters: CursorAutocompleter[],
  userInput: string
): RenderedSuggestion[] {
  if (autocompleters.length === 0) {
    return []
  }

  const suggestions = [...staticSuggestions]
  for (const autocompleter of autocompleters) {
    const prefixSuggestions = autocompleter.getPrefixSuggestions(userInput)
    if (prefixSuggestions) {
      if (userInput.length <= 1) {
        return prefixSuggestions
      }
      const options: Fuse.FuseOptions<SuggestedNode> = {
        keys: ['key', 'display', 'searchTerms'],
        caseSensitive: false,
        threshold: 1.0,
      }
      const suggestions = prefixSuggestions
      const fuse = new Fuse(suggestions, options)
      const results = fuse.search(userInput) as RenderedSuggestion[]
      return results
    }

    suggestions.push(...autocompleter.getDynamicSuggestions(userInput))
  }

  const options: Fuse.FuseOptions<SuggestedNode> = {
    keys: ['key', 'display', 'searchTerms'],
    caseSensitive: false,
  }
  const fuse = new Fuse(suggestions, options)
  const results = fuse.search(userInput) as RenderedSuggestion[]
  return results
}

class CursorAutocompleter {
  cursor: NodeCursor
  parentRef: ParentReference
  index: number
  category: NodeCategory
  autocompleter: Autocompleter

  constructor(cursor: NodeCursor, excludedCategores: Set<NodeCategory>) {
    this.cursor = cursor
    this.parentRef = cursor.listBlock.childSet.getParentRef()
    this.index = cursor.index
    this.category = cursor.listBlock.childSet.nodeCategory
    this.autocompleter = getAutocompleRegistry().getAutocompleter(this.category, excludedCategores)
  }

  renderSuggestion = (suggestedNode: SuggestedNode): RenderedSuggestion => {
    const rendered = suggestedNode as RenderedSuggestion
    rendered.nodeBlock = new NodeBlock(null, suggestedNode.node, null, 0)
    rendered.nodeBlock.calculateDimensions(0, 0, null)
    rendered.childSet = this.cursor.listBlock.childSet
    rendered.index = this.cursor.index
    return rendered
  }

  getStaticSuggestions(): RenderedSuggestion[] {
    return this.autocompleter.getStaticSuggestions(this.parentRef, this.index).map(this.renderSuggestion)
  }

  getDynamicSuggestions(userInput: string): RenderedSuggestion[] {
    return this.autocompleter.getDynamicSuggestions(this.parentRef, this.index, userInput).map(this.renderSuggestion)
  }

  getPrefixSuggestions(userInput: string): RenderedSuggestion[] {
    return this.autocompleter.getPrefixSuggestions(this.parentRef, this.index, userInput)?.map(this.renderSuggestion)
  }
}

interface InsertBoxState {
  userInput: string
  autoWidth: number
  filteredSuggestions: RenderedSuggestion[]
  staticSuggestions: RenderedSuggestion[]
  cursorPosition: CursorPosition
  autocompleters: CursorAutocompleter[]
  activeSuggestion: number
}

interface InsertBoxProps {
  editorX: number
  editorY: number
  cursorPosition: CursorPosition
  insertBoxData: InsertBoxData
  selection: NodeSelection
}

@observer
export class InsertBox extends React.Component<InsertBoxProps, InsertBoxState> {
  private inputRef: React.RefObject<HTMLInputElement>

  constructor(props: InsertBoxProps) {
    super(props)
    this.inputRef = React.createRef()

    this.state = {
      userInput: '',
      autoWidth: this.getWidth(''),
      cursorPosition: null,
      filteredSuggestions: [],
      autocompleters: [],
      staticSuggestions: [],
      activeSuggestion: 0,
    }
  }

  static getDerivedStateFromProps(props: InsertBoxProps, state: InsertBoxState) {
    const { cursorPosition, selection } = props

    if (cursorPosition !== state.cursorPosition) {
      const cursors = selection.getAutocompleteNodeCursors()
      const staticSuggestions: RenderedSuggestion[] = []
      const autocompleters: CursorAutocompleter[] = []
      const categorySet = new Set<NodeCategory>()

      for (const cursor of cursors) {
        const childSetBlock = cursor.listBlock
        const category = childSetBlock.childSet.nodeCategory
        if (!childSetBlock.allowInsert() || category in categorySet) {
          continue
        }

        const autocompleter = new CursorAutocompleter(cursor, categorySet)
        categorySet.add(category)
        getAutocompleRegistry()
          .getAdapatableCategories(category)
          .forEach((cat) => categorySet.add(cat))
        autocompleters.push(autocompleter)
        staticSuggestions.push(...autocompleter.getStaticSuggestions())
      }

      const filteredSuggestions = filterSuggestions(staticSuggestions, autocompleters, state.userInput)
      return {
        currentCursors: cursors,
        filteredSuggestions: filteredSuggestions,
        cursorPosition: cursorPosition,
        staticSuggestions: staticSuggestions,
        activeSuggestion: 0,
        autocompleters: autocompleters,
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
                    <EditorNodeBlock block={suggestion.nodeBlock} selectionState={NodeSelectionState.UNSELECTED} />
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
    if (e.key === 'Escape' || (e.key == 'Backspace' && this.state.userInput === '')) {
      this.inputRef.current.value = ''
      selection.exitEdit()
      e.stopPropagation()
    }

    // Enter, Tab
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      e.preventDefault()
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
      e.preventDefault()
      if (activeSuggestion === 0) {
        return
      }
      this.setState({ activeSuggestion: activeSuggestion - 1 })
    }
    // User pressed the down arrow, increment the index
    else if (e.key === 'ArrowDown' && filteredSuggestions.length > 0) {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      e.preventDefault()
      if (activeSuggestion === filteredSuggestions.length - 1) {
        return
      }
      this.setState({ activeSuggestion: activeSuggestion + 1 })
    }

    e.stopPropagation()
    e.nativeEvent.stopImmediatePropagation()
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
      const { staticSuggestions, autocompleters } = this.state
      const filteredSuggestions = filterSuggestions(staticSuggestions, autocompleters, userInput)
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

  onSelected(suggestion: RenderedSuggestion) {
    const { selection } = this.props
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
      selection.wrapNode(suggestion.childSet, suggestion.index - 1, node, suggestion.wrapChildSetId)
    } else {
      selection.insertNodeByChildSet(suggestion.childSet, suggestion.index, node)
    }
    this.inputRef.current.value = ''
  }

  // Event fired when the user clicks on a suggestion
  onClickSuggestion = (suggestion: RenderedSuggestion) => {
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
