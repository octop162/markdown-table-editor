import React, { useMemo, useEffect, useCallback, useState } from 'react';
import { Table } from './components/Table';
import { TableData, CellData } from './types/table';
import { useTableData } from './hooks/useTableData';
import { convertToMarkdown } from './utils/markdownConverter';

// EditableTableData型を定義
interface EditableTableData {
  rows: {
    id: string;
    cells: { id: string; value: string }[];
  }[];
  columns: {
    id: string;
    index: number;
    width: string;
  }[];
}

// Appコンポーネントのprops型を定義
interface AppProps {
  tableData: EditableTableData | null;
  onTableUpdate: (updatedData: EditableTableData) => void;
  onSaveTable: (markdown: string) => void;
}

// EditableTableDataをTableDataに変換する関数
const convertToTableData = (editableData: EditableTableData): TableData => {
  return editableData.rows.map(row => 
    row.cells.map(cell => ({
      value: cell.value,
      isEditing: false,
      width: 100 // デフォルト幅
    }))
  );
};

function App({ tableData, onTableUpdate, onSaveTable }: AppProps) {
  // テーブルデータがない場合は読み込み中を表示
  if (!tableData) {
    return <div className="loading">テーブルデータを読み込み中...</div>;
  }

  // 文字揃えの状態を管理
  // const [columnAligns, setColumnAligns] = useState<Array<'left' | 'center' | 'right'>>(
  //   Array(tableData.columns.length).fill('left')
  // );

  // EditableTableDataをTableDataに変換
  const convertedTableData = useMemo(() => convertToTableData(tableData), [tableData]);
  
  // useTableDataフックを使用してテーブルデータを管理
  // const { 
  //   data: currentTableData,
  //   updateCell,
  //   addRow,
  //   removeRow,
  //   addColumn,
  //   removeColumn,
  //   // その他の関数は必要に応じて追加
  // } = useTableData(convertedTableData);
  
  // // テーブルデータが変更されたら親コンポーネントに通知
  // useEffect(() => {
  //   if (currentTableData) {
  //     // TableDataをEditableTableDataに変換
  //     const updatedEditableData = {
  //       rows: currentTableData.map((row, rowIndex) => {
  //         return {
  //           id: tableData.rows[rowIndex]?.id || `row-${rowIndex}`,
  //           cells: row.map((cell, cellIndex) => {
  //             return {
  //               id: tableData.rows[rowIndex]?.cells[cellIndex]?.id || `cell-${rowIndex}-${cellIndex}`,
  //               value: cell.value
  //             };
  //           })
  //         };
  //       }),
  //       columns: tableData.columns
  //     };
      
  //     onTableUpdate(updatedEditableData);
  //   }
  // }, [currentTableData, onTableUpdate, tableData]);

  // 保存ボタンが押されたときの処理
  // const handleSave = useCallback(() => {
  //   console.log('保存ボタンが押されました');
    
  //   // utils/markdownConverter.tsのconvertToMarkdown関数を使用してMarkdownテーブルを生成
  //   if (currentTableData) {
  //     // Markdownテーブルを生成
  //     const markdownTable = convertToMarkdown(currentTableData, columnAligns);
  //     console.log('生成されたMarkdownテーブル:', markdownTable);
  //   }
    
  //   // 親コンポーネントの保存関数を呼び出す
  //   onSaveTable();
  // }, [onSaveTable, currentTableData, columnAligns]);

  // 文字揃えが変更されたときの処理
  // const handleAlignChange = useCallback((align: 'left' | 'center' | 'right', colIndex: number) => {
  //   setColumnAligns(prev => {
  //     const newAligns = [...prev];
  //     newAligns[colIndex] = align;
  //     return newAligns;
  //   });
  // }, []);

  return (
    <div className="app">
      <Table 
        initialData={convertedTableData} 
        onSave={onSaveTable}
      />
    </div>
  )
}

export default App
