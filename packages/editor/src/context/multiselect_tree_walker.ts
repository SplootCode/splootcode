import { NodeCursor, SelectionState } from './selection'
import { RenderedChildSetBlock } from '../layout/rendered_childset_block'
import { RenderedTreeIterator } from './rendered_tree_iterator'

export class MultiselectTreeWalker extends RenderedTreeIterator {
  selectedListBlocks: Set<RenderedChildSetBlock>

  constructor(start: NodeCursor, end: NodeCursor) {
    super(start, end)
    this.selectedListBlocks = new Set()
  }

  visitedRangeLeft(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    listBlock.selectionState = SelectionState.MultiNode
    listBlock.selectedIndexStart = startIndex
    listBlock.selectedIndexEnd = endIndex
    this.selectedListBlocks.add(listBlock)
  }

  visitedRangeRight(listBlock: RenderedChildSetBlock, startIndex: number, endIndex: number) {
    listBlock.selectionState = SelectionState.MultiNode
    listBlock.selectedIndexStart = startIndex
    listBlock.selectedIndexEnd = endIndex
    this.selectedListBlocks.add(listBlock)
  }

  getSelectedListBlocks(): Set<RenderedChildSetBlock> {
    return this.selectedListBlocks
  }
}
