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
  staticSuggestionsKeys: Set<string>,
  autocompleters: CursorAutocompleter[],
  userInput: string
): RenderedSuggestion[] {
  if (autocompleters.length === 0) {
    return []
  }

  const dynamicSuggestions = []
  const dynamicSuggestionsKeys: Set<string> = new Set()
  for (const autocompleter of autocompleters) {
    const prefixSuggestions = autocompleter.getPrefixSuggestions(userInput)
    if (prefixSuggestions) {
      if (userInput.length <= 1) {
        return prefixSuggestions
      }
      const options: Fuse.FuseOptions<SuggestedNode> = {
        keys: [
          { name: 'exactMatch', weight: 0.8 },
          { name: 'searchTerms', weight: 0.1 },
          { name: 'display', weight: 0.1 },
        ],
        caseSensitive: true,
        threshold: 1.0,
      }
      const suggestions = prefixSuggestions
      const fuse = new Fuse(suggestions, options)
      const results = fuse.search(userInput) as RenderedSuggestion[]
      return results
    }
    const newDynamicSuggestions = autocompleter.getDynamicSuggestions(userInput).filter((suggestion) => {
      const isNew = !staticSuggestionsKeys.has(suggestion.key) && !dynamicSuggestionsKeys.has(suggestion.key)
      dynamicSuggestionsKeys.add(suggestion.key)
      return isNew
    })
    dynamicSuggestions.push(...newDynamicSuggestions)
  }

  const options: Fuse.FuseOptions<SuggestedNode> = {
    keys: [
      { name: 'exactMatch', weight: 0.8 },
      { name: 'searchTerms', weight: 0.1 },
      { name: 'display', weight: 0.1 },
    ],
    caseSensitive: true,
  }
  const fuse = new Fuse(staticSuggestions, options)
  const results = fuse.search(userInput) as RenderedSuggestion[]
  const dynamicFuse = new Fuse(dynamicSuggestions, options)
  const dynamicResults = dynamicFuse.search(userInput) as RenderedSuggestion[]
  return [...dynamicResults, ...results]
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
  staticSuggestionKeys: Set<string>
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
      staticSuggestionKeys: new Set(),
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

      const staticSuggestionKeys: Set<string> = new Set()
      staticSuggestions.forEach((suggestion) => {
        staticSuggestionKeys.add(suggestion.key)
      })

      const filteredSuggestions = filterSuggestions(
        staticSuggestions,
        staticSuggestionKeys,
        autocompleters,
        state.userInput
      )

      return {
        filteredSuggestions: filteredSuggestions,
        cursorPosition: cursorPosition,
        staticSuggestions: staticSuggestions,
        staticSuggestionKeys: staticSuggestionKeys,
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

  prefixMatch(userInput: string, prefix: string, remainder: string): RenderedSuggestion {
    prefix = prefix.trim()
    if (prefix.length === userInput.length) {
      return null
    }
    userInput = userInput.trim()

    const { staticSuggestions, staticSuggestionKeys, autocompleters } = this.state
    const suggestions = filterSuggestions(staticSuggestions, staticSuggestionKeys, autocompleters, prefix)
    if (suggestions.length === 0) {
      return null
    }
    // Check this isn't the prefix of any of the next 3 suggestions
    const lim = Math.min(3, suggestions.length)
    let exactMatch = null
    let prefixMatch = false
    for (let i = 0; i < lim; i++) {
      const suggestion = suggestions[i]
      if (!exactMatch && suggestion.isExactMatch(prefix)) {
        exactMatch = suggestion
      } else if (suggestion.isPrefixMatch(userInput)) {
        prefixMatch = true
      }
    }
    if (exactMatch && !prefixMatch) {
      return exactMatch
    }

    return null
  }

  handleEarlyInsert(userInput: string): string {
    if (userInput.length < 2) {
      return userInput
    }

    // Ignore strings for early exit, otherwise escaping is necessary
    if (userInput.match(/^"'/)) {
      return userInput
    }

    // Numbers
    const numericMatch = userInput.match(/^([0-9][0-9.]+)(.*)/)
    if (numericMatch) {
      const matchingSuggestion = this.prefixMatch(userInput, numericMatch[1], numericMatch[2])
      if (matchingSuggestion) {
        this.onSelected(matchingSuggestion, numericMatch[2].trim())
        return numericMatch[2].trim()
      }
      return userInput
    }

    // Keywords and identifiers
    const alphaMatch = userInput.match(/^(\.?[\p{L}_][\p{L}_0-9]*)\(?([^\(]*)/iu)
    if (alphaMatch) {
      const matchingSuggestion = this.prefixMatch(userInput, alphaMatch[1], alphaMatch[2])
      if (matchingSuggestion) {
        this.onSelected(matchingSuggestion, alphaMatch[2].trim())
        return alphaMatch[2].trim()
      }
      // Keywords and identifiers with spaces (does not apply to methods)
      const alphaMatch2 = userInput.match(/^(\?[\p{L}_][\p{L}_0-9\s]*)\(?([^\(]*)/iu)
      if (alphaMatch2) {
        const matchingSuggestion = this.prefixMatch(userInput, alphaMatch2[1], alphaMatch2[2])
        if (matchingSuggestion) {
          this.onSelected(matchingSuggestion, alphaMatch[2].trim())
          return alphaMatch2[2].trim()
        }
      }
      return userInput
    }

    // operators
    const operatorMatch = userInput.match(/^([+\-*\/><%^~!=]+)(.*)/)
    if (operatorMatch) {
      const matchingSuggestion = this.prefixMatch(userInput, operatorMatch[1], operatorMatch[2])
      if (matchingSuggestion) {
        this.onSelected(matchingSuggestion, operatorMatch[2].trim())
        return operatorMatch[2].trim()
      }
      return userInput
    }

    // Specifically brackets
    const bracketMatch = userInput.match(/^(\()(.*)/)
    if (bracketMatch) {
      const matchingSuggestion = this.prefixMatch(userInput, bracketMatch[1], bracketMatch[2])
      if (matchingSuggestion) {
        this.onSelected(matchingSuggestion, bracketMatch[2])
        return bracketMatch[2].trim()
      }
      return userInput
    }

    return userInput
  }

  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === ' ') {
      e.currentTarget.value = ''
    }
    const userInput = this.handleEarlyInsert(e.currentTarget.value)
    if (userInput !== '') {
      const { staticSuggestions, staticSuggestionKeys, autocompleters } = this.state
      const filteredSuggestions = filterSuggestions(staticSuggestions, staticSuggestionKeys, autocompleters, userInput)

      this.props.selection.startInsertAtCurrentCursor()
      this.setState({
        userInput: e.currentTarget.value,
        activeSuggestion: 0,
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: filteredSuggestions,
      })
    } else {
      const { selection } = this.props
      selection.exitEdit()
      this.setState({
        userInput: '',
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: [],
        activeSuggestion: 0,
      })
    }
  }

  onSelected(suggestion: RenderedSuggestion, leftoverText = '') {
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
    this.inputRef.current.value = leftoverText
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
