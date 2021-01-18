import React from 'react'
import Fuse from 'fuse.js';

import { NodeSelection, NodeSelectionState, SelectionState } from '../../context/selection';
import { observer } from 'mobx-react';
import { SuggestedNode } from '../../language/suggested_node';
import { getAutocompleteFunctionsForCategory, SuggestionGenerator } from '../../language/node_category_registry';
import { ParentReference } from '../../language/node';

import "./insert_box.css";
import { InsertBoxData } from '../../context/insert_box';
import { EditorNodeBlock } from './node_block';


function filterSuggestions(parentRef: ParentReference, index: number, staticSuggestions: SuggestedNode[], generators: Set<SuggestionGenerator>, userInput: string) : SuggestedNode[] {
  let suggestions = [...staticSuggestions];
  generators.forEach((generator: SuggestionGenerator) => {
    suggestions = suggestions.concat(generator.dynamicSuggestions(parentRef, index, userInput))
  });
  const options: Fuse.FuseOptions<SuggestedNode> = {
    keys: ['key', 'display', 'searchTerms'],
    caseSensitive: false,
  };
  const fuse = new Fuse(suggestions, options)
  const results = fuse.search(userInput) as SuggestedNode[];
  return results;
}

interface InsertBoxState {
  userInput: string;
  autoWidth: number;
  filteredSuggestions: SuggestedNode[];
  staticSuggestions: SuggestedNode[];
  suggestionGenerators: Set<SuggestionGenerator>;
  activeSuggestion: number;
}

interface InsertBoxProps {
  editorX: number;
  editorY: number;
  insertBoxData: InsertBoxData;
  selection: NodeSelection;
}

@observer
export class InsertBox extends React.Component<InsertBoxProps, InsertBoxState> {

  constructor(props: InsertBoxProps) {
    super(props);
    let { selection, insertBoxData } = this.props;
    let childSetBlock = selection.cursor.listBlock;
    let index = selection.cursor.index;

    let category = childSetBlock.childSet.nodeCategory;
    let parentRef = childSetBlock.childSet.getParentRef();
    let suggestionGeneratorSet = getAutocompleteFunctionsForCategory(category)
    let staticSuggestions = [];
    suggestionGeneratorSet.forEach((generator: SuggestionGenerator) => {
      staticSuggestions = staticSuggestions.concat(generator.staticSuggestions(parentRef, index))
    })

    this.state = {
      userInput: '',
      autoWidth: this.getWidth(''),
      filteredSuggestions: filterSuggestions(parentRef, index, staticSuggestions, suggestionGeneratorSet, ''),
      suggestionGenerators: suggestionGeneratorSet,
      staticSuggestions: staticSuggestions,
      activeSuggestion: 0,
    };
  }

  render() {
    let { userInput, autoWidth, filteredSuggestions, activeSuggestion } = this.state;
    let { selection } = this.props;
    const isInserting = selection.state === SelectionState.Inserting;

    let suggestionsListComponent: JSX.Element;

    if (selection.state === SelectionState.Inserting) {
      if (filteredSuggestions.length) {
        suggestionsListComponent = (
          <ul className="autocomplete-suggestions">
            {filteredSuggestions.map((suggestion, index) => {
              let className: string = '';

              // Flag the active suggestion with a class
              if (index === activeSuggestion) {
                className = "autocomplete-suggestion-active";
              }

              if (!suggestion.valid) {
                className += " invalid"
              }

              return (
                <li
                  className={className}
                  key={suggestion.key}
                  onClick={this.onClickSuggestion(suggestion)}
                >
                  <svg
                      className="autocomplete-inline-svg"
                      height={suggestion.nodeBlock.rowHeight}
                      width={suggestion.nodeBlock.rowWidth + 2}
                  ><EditorNodeBlock block={suggestion.nodeBlock} onClickHandler={()=>{}} selection={null} selectionState={NodeSelectionState.UNSELECTED}/></svg>
                  <span className="autocomplete-description">{ suggestion.description}</span>
                </li>
              );
            })}
          </ul>
        );
      } else {
        suggestionsListComponent = (
          <div className="autocomplete-no-suggestions">
            <em>No suggestions, you're on your own!</em>
          </div>
        );
      }
    }

    let {editorX, editorY} = this.props;
    let {x, y} = this.props.insertBoxData;
    let positionStyles : React.CSSProperties;
    if (isInserting) {
      positionStyles = {
        position: 'absolute',
        left: (x + editorX) + 'px',
        top: (y + editorY + 1) + 'px',
      }
    } else {
      positionStyles = {
        position: 'absolute',
        left: (x + editorX - 2) + 'px',
        top: (y + editorY + 1) + 'px',
      }
    }

    return (
      <div style={positionStyles}>
        <div className={isInserting ? "input-box" : "hidden-input-box"}>
          <input
              autoFocus
              type="text"
              defaultValue={userInput}
              onChange={this.onChange}
              onClick={this.onClick}
              onKeyDown={this.onKeyDown}
              onBlur={this.onBlur}
              style={{"width": autoWidth}}
              />
        </div>
        { suggestionsListComponent }
      </div>
    );
  }

  onKeyDown = (e : React.KeyboardEvent<HTMLInputElement>) => {
    // Escape and enter keys
    if (e.keyCode === 27 || e.keyCode === 13) {
      // Clear edit state
      this.props.selection.exitEdit();
      e.stopPropagation();
    }

    const { activeSuggestion, filteredSuggestions } = this.state;

    // Escape
    if (e.keyCode === 27) {
      this.props.selection.exitEdit();
      e.stopPropagation();
    }

    // Enter key
    if (e.keyCode === 13) {
        e.stopPropagation();
        let selection = filteredSuggestions[activeSuggestion];
        if (selection !== undefined) {
            this.setState({
                activeSuggestion: 0,
            });
            this.onSelected(selection);
        }
    }
    // User pressed the up arrow, decrement the index
    else if (e.keyCode === 38) {
      if (activeSuggestion === 0) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion - 1 });
    }
    // User pressed the down arrow, increment the index
    else if (e.keyCode === 40) {
      if (activeSuggestion - 1 === filteredSuggestions.length) {
        return;
      }

      this.setState({ activeSuggestion: activeSuggestion + 1 });
    }
  }

  onBlur = (e : React.FocusEvent<HTMLInputElement>) => {
    let selection = this.props.selection;
    if (selection.state === SelectionState.Cursor) {
      selection.clearSelection();
    }
  }

  getWidth = (input: string) => {
    // Horrible hack :)
    return Math.max(input.length * 8 + 6, 10);
  }

  onClick = (e : React.MouseEvent<HTMLInputElement>) => {
    // e.stopPropagation();
  }

  onChange = (e : React.ChangeEvent<HTMLInputElement>) => {
    const userInput = e.currentTarget.value;
    const { staticSuggestions, suggestionGenerators } = this.state;
    let childSetBlock = this.props.selection.cursor.listBlock;
    let index = this.props.selection.cursor.index;

    let parentRef = childSetBlock.childSet.getParentRef();
    const filteredSuggestions = filterSuggestions(parentRef, index, staticSuggestions, suggestionGenerators, userInput);
    this.props.selection.startInsertAtCurrentCursor();
    this.setState({
        userInput: e.currentTarget.value,
        autoWidth: this.getWidth(e.currentTarget.value),
        filteredSuggestions: filteredSuggestions,
    });
  }

  onSelected(suggestion: SuggestedNode) {
    const {selection} = this.props;
    let childSetBlock = selection.cursor.listBlock;
    let index = selection.cursor.index;
    if (suggestion.wrapChildSetId) {
      selection.wrapNode(childSetBlock, index - 1, suggestion.node, suggestion.wrapChildSetId);
    } else {
      selection.insertNode(childSetBlock, index, suggestion.node);
    }
  }

  // Event fired when the user clicks on a suggestion
  onClickSuggestion = (suggestion: SuggestedNode) => {
    return (e : React.MouseEvent<HTMLLIElement>) => {
      // Update the user input and reset the rest of the state
      this.setState({
        activeSuggestion: 0,
        filteredSuggestions: [],
      });
      this.onSelected(suggestion);
    };
  };
}