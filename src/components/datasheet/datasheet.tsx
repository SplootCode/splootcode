import React from 'react'
import { observer } from "mobx-react";
import Spreadsheet from "react-spreadsheet";
import { DataSheetState } from '../../context/editor_context';



interface DataSheetEditorProps {
  state: DataSheetState;
}

@observer
export class DataSheetEditor extends React.Component<DataSheetEditorProps> {
  render() {
    const data = [
      [{ value: "你好" }, { value: "nǐ hǎo" }, {value: 'Hello'}],
      [{ value: "什么" }, { value: "shén me" }, {value: 'what'}],
      [{ value: "再见" }, { value: "zài jiàn" }, {value: 'Goodbye'}],
    ];
    
    return <Spreadsheet data={data} columnLabels={['characters', 'pinyin', 'english']}/>
  }
}
