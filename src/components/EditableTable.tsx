import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import EditableRow from './EditableRow';
import SortableColumn from './SortableColumn';
import styles from './EditableTable.module.css';

// SVGアイコンコンポーネント
const AddRowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18M12 3v18"/>
    <rect x="4" y="8" width="16" height="8" rx="1" />
  </svg>
);

const AddColumnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18M12 3v18"/>
    <rect x="8" y="4" width="8" height="16" rx="1" />
  </svg>
);

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14l-4-4 4-4"/>
    <path d="M5 10h11a4 4 0 0 1 0 8h-1"/>
  </svg>
);

const ClearSelectionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3"/>
    <circle cx="6" cy="18" r="3"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
  </svg>
);

const PasteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

interface TableData {
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

// セル選択の座標を表す型
interface CellPosition {
  rowIndex: number;
  cellIndex: number;
}

export default function EditableTable() {
  const [tableData, setTableData] = useState<TableData>({
    rows: [
      { 
        id: 'row-1', 
        cells: Array(3).fill('').map((_, i) => ({ 
          id: `cell-1-${i}`, 
          value: '' 
        })) 
      },
      { 
        id: 'row-2', 
        cells: Array(3).fill('').map((_, i) => ({ 
          id: `cell-2-${i}`, 
          value: '' 
        })) 
      },
      { 
        id: 'row-3', 
        cells: Array(3).fill('').map((_, i) => ({ 
          id: `cell-3-${i}`, 
          value: '' 
        })) 
      },
    ],
    columns: [
      { id: 'column-0', index: 0, width: '100px' },
      { id: 'column-1', index: 1, width: '100px' },
      { id: 'column-2', index: 2, width: '100px' },
    ]
  });

  // 履歴管理用の状態
  const [history, setHistory] = useState<TableData[]>([]);
  const isUndoingRef = useRef(false);

  // 選択されたセルを管理する状態
  const [selectedCells, setSelectedCells] = useState<CellPosition[]>([]);
  // 最後に選択されたセルを記録（Shift+クリックの起点）
  const [lastSelectedCell, setLastSelectedCell] = useState<CellPosition | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 元に戻す処理
  const handleUndo = () => {
    if (history.length === 0) return;
    
    isUndoingRef.current = true;
    const previousState = history[history.length - 1];
    setTableData(previousState);
    setHistory(prev => prev.slice(0, -1));
  };

  // 文字列の長さに基づいて幅を計算する関数
  const calculateColumnWidth = useCallback((columnIndex: number) => {
    // 各列の最大文字数を取得
    const maxLength = tableData.rows.reduce((max, row) => {
      const cellValue = row.cells[columnIndex]?.value || '';
      
      // 改行を考慮して最大長を計算
      const lines = cellValue.split('\n');
      const maxLineLength = lines.reduce((lineMax, line) => 
        Math.max(lineMax, line.length), 0);
      
      return Math.max(max, maxLineLength);
    }, 0);

    // 最小幅を設定（文字がない場合でも最低限の幅を確保）
    const minWidth = 70;
    
    // 文字数に基づいて幅を計算（1文字あたり約10px + パディング）
    const calculatedWidth = Math.max(minWidth, maxLength * 15 + 16);
    
    return `${calculatedWidth}px`;
  }, [tableData.rows]);

  // 列の幅を自動調整する
  const autoResizeColumns = useCallback(() => {
    setTableData(prev => {
      const updatedColumns = prev.columns.map((col, index) => {
        return { ...col, width: calculateColumnWidth(index) };
      });
      
      return {
        ...prev,
        columns: updatedColumns
      };
    });
  }, [calculateColumnWidth]);

  // セルの内容が変更されたときに列の幅を自動調整
  useEffect(() => {
    autoResizeColumns();
  }, [tableData.rows, autoResizeColumns]);

  const handleCellChange = (rowId: string, cellId: string, newValue: string) => {
    setTableData(prev => ({
      ...prev,
      rows: prev.rows.map(row => 
        row.id === rowId 
          ? { 
              ...row, 
              cells: row.cells.map(cell => 
                cell.id === cellId ? { ...cell, value: newValue } : cell
              ) 
            } 
          : row
      )
    }));

    // 履歴に追加
    setHistory([...history, tableData]);
  };

  // セルがクリックされたときの処理
  const handleCellClick = (rowIndex: number, cellIndex: number, isShiftKey: boolean) => {
    if (!isShiftKey) {
      // 通常クリック - 単一選択
      setSelectedCells([{ rowIndex, cellIndex }]);
      setLastSelectedCell({ rowIndex, cellIndex });
    } else if (lastSelectedCell) {
      // Shiftキーを押しながらのクリック - 範囲選択
      const startRow = Math.min(lastSelectedCell.rowIndex, rowIndex);
      const endRow = Math.max(lastSelectedCell.rowIndex, rowIndex);
      const startCell = Math.min(lastSelectedCell.cellIndex, cellIndex);
      const endCell = Math.max(lastSelectedCell.cellIndex, cellIndex);

      const newSelection: CellPosition[] = [];
      
      // 選択範囲内のすべてのセルを選択
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCell; c <= endCell; c++) {
          newSelection.push({ rowIndex: r, cellIndex: c });
        }
      }
      
      setSelectedCells(newSelection);
    }
  };

  // 選択を解除する処理
  const clearSelection = () => {
    setSelectedCells([]);
    setLastSelectedCell(null);
  };

  // セルが選択されているかどうかを確認
  const isCellSelected = (rowIndex: number, cellIndex: number): boolean => {
    return selectedCells.some(
      cell => cell.rowIndex === rowIndex && cell.cellIndex === cellIndex
    );
  };

  // 選択されたセルの値をコピーする
  const copySelectedCells = useCallback(() => {
    if (selectedCells.length === 0) return;

    // 選択範囲の境界を計算
    const rowIndices = selectedCells.map(cell => cell.rowIndex);
    const cellIndices = selectedCells.map(cell => cell.cellIndex);
    
    const minRow = Math.min(...rowIndices);
    const maxRow = Math.max(...rowIndices);
    const minCell = Math.min(...cellIndices);
    const maxCell = Math.max(...cellIndices);
    
    // 2次元配列を作成して選択されたセルの値を格納
    const values: string[][] = [];
    
    for (let r = minRow; r <= maxRow; r++) {
      const rowValues: string[] = [];
      for (let c = minCell; c <= maxCell; c++) {
        // セルの値を取得（選択されていないセルも含む矩形範囲すべて）
        const cellValue = tableData.rows[r]?.cells[c]?.value || '';
        
        // セルの値に改行やタブが含まれている場合、または値が空でない場合に引用符で囲む
        let formattedValue = cellValue;
        if (cellValue.includes('\n') || cellValue.includes('\t') || cellValue.includes('"')) {
          // 引用符をエスケープ（" を "" に置換）
          formattedValue = cellValue.replace(/"/g, '""');
          // 値を引用符で囲む
          formattedValue = `"${formattedValue}"`;
        }
        
        rowValues.push(formattedValue);
      }
      values.push(rowValues);
    }
    
    // クリップボードにコピー（タブ区切りの文字列として）
    const clipboardText = values
      .map(row => row.join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(clipboardText)
      .then(() => {
        console.log('セルの内容をコピーしました');
      })
      .catch(err => {
        console.error('コピーに失敗しました:', err);
      });
  }, [selectedCells, tableData]);

  // 選択されたセルの値をカットする（コピーして削除）
  const cutSelectedCells = useCallback(() => {
    if (selectedCells.length === 0) return;
    
    // まず内容をコピー
    copySelectedCells();
    
    // 次に選択されたセルの内容をクリア
    setTableData(prev => {
      const newRows = [...prev.rows];
      
      selectedCells.forEach((cell) => {
        if (newRows[cell.rowIndex] && newRows[cell.rowIndex].cells[cell.cellIndex]) {
          newRows[cell.rowIndex].cells[cell.cellIndex].value = '';
        }
      });
      
      return {
        ...prev,
        rows: newRows
      };
    });
    
    console.log('セルの内容をカットしました');
  }, [selectedCells, copySelectedCells]);

  // クリップボードからデータを取得してペーストする
  const pasteFromClipboard = useCallback(async () => {
    if (selectedCells.length === 0) return;
    
    try {
      // クリップボードからテキストを取得
      const clipboardText = await navigator.clipboard.readText();
      
      // "で括られたテキストを処理するための関数
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let cell = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
          const char = line[i];
          
          if (inQuotes) {
            // 引用符内にいる場合
            if (char === '"') {
              // 次の文字も引用符かチェック（エスケープ処理）
              if (i + 1 < line.length && line[i + 1] === '"') {
                // 連続する引用符はエスケープされた引用符として扱う
                cell += '"';
                i += 2; // 2つの引用符をスキップ
              } else {
                // 引用符の終わり
                inQuotes = false;
                i++;
              }
            } else {
              // 引用符内の通常の文字（改行を含む）
              cell += char;
              i++;
            }
          } else {
            // 引用符外にいる場合
            if (char === '"') {
              // 引用符の開始
              inQuotes = true;
              i++;
            } else if (char === '\t') {
              // タブ区切り（セルの区切り）
              result.push(cell);
              cell = '';
              i++;
            } else {
              // 通常の文字
              cell += char;
              i++;
            }
          }
        }
        
        // 最後のセルを追加
        result.push(cell);
        return result;
      };
      
      // 行を処理する
      const processRows = (text: string): string[][] => {
        // 行に分割（引用符内の改行は保持）
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentLine = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
            currentLine += char;
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // 引用符外の改行は行の区切り
            if (currentLine.trim() !== '') {
              currentRow = parseCSVLine(currentLine);
              rows.push(currentRow);
              currentLine = '';
            }
            
            // \r\nの場合は\nをスキップ
            if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
              i++;
            }
          } else {
            currentLine += char;
          }
        }
        
        // 最後の行を処理
        if (currentLine.trim() !== '') {
          currentRow = parseCSVLine(currentLine);
          rows.push(currentRow);
        }
        
        return rows;
      };
      
      // クリップボードテキストを処理
      const pasteData = processRows(clipboardText);
      
      // ペーストするデータの寸法を計算
      const height = pasteData.length;
      const width = Math.max(...pasteData.map(row => row.length));
      
      // ペースト処理を実行
      const targetRow = selectedCells[0].rowIndex;
      const targetCell = selectedCells[0].cellIndex;
      
      setTableData(prev => {
        let newRows = [...prev.rows];
        const newColumns = [...prev.columns];
        
        // 行と列の追加が必要かどうかを確認
        const needsNewRows = targetRow + height > newRows.length;
        const needsNewColumns = targetCell + width > newColumns.length;
        
        // 必要な行数を確保（足りない場合は追加）
        const requiredRows = targetRow + height;
        if (needsNewRows) {
          // 足りない行を追加
          for (let i = newRows.length; i < requiredRows; i++) {
            const newRowId = `row-${Date.now()}-${i}`;
            newRows.push({
              id: newRowId,
              cells: newColumns.map((_, colIndex) => ({
                id: `cell-${newRowId}-${colIndex}`,
                value: ''
              }))
            });
          }
        }
        
        // 必要な列数を確保（足りない場合は追加）
        const requiredColumns = targetCell + width;
        if (needsNewColumns) {
          // 足りない列を追加
          const originalColumnCount = newColumns.length;
          for (let i = originalColumnCount; i < requiredColumns; i++) {
            const newColumnId = `column-${Date.now()}-${i}`;
            newColumns.push({
              id: newColumnId,
              index: i,
              width: '100px' // デフォルト幅
            });
            
            // 各行に新しいセルを追加
            newRows = newRows.map(row => {
              const newCells = [...row.cells];
              newCells.push({
                id: `cell-${row.id}-${i}`,
                value: ''
              });
              return {
                ...row,
                cells: newCells
              };
            });
          }
        }
        
        // データをペースト
        for (let r = 0; r < height; r++) {
          const rowIndex = targetRow + r;
          
          for (let c = 0; c < width; c++) {
            const cellIndex = targetCell + c;
            
            // セルの値を更新
            if (newRows[rowIndex] && newRows[rowIndex].cells[cellIndex]) {
              newRows[rowIndex].cells[cellIndex].value = pasteData[r][c] || '';
            }
          }
        }
        
        return {
          columns: newColumns,
          rows: newRows
        };
      });

      // 履歴に追加
      setHistory([...history, tableData]);
      
    } catch (err) {
      console.error('クリップボードからの読み取りに失敗しました:', err);
    }
  }, [selectedCells]);

  // キーボードイベントを処理するためのイベントリスナーを追加
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 編集中のセル（contentEditableがアクティブな状態）では処理しない
      if (document.activeElement?.hasAttribute('contenteditable')) {
        return;
      }
      
      // Ctrl+Z または Cmd+Z で元に戻す
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      
      // コピー＆ペーストのショートカットキー処理
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        
        if (e.key === 'c') {
          // Ctrl+C または Cmd+C でコピー
          copySelectedCells();
        } else if (e.key === 'v') {
          // Ctrl+V または Cmd+V でペースト
          pasteFromClipboard();
        } else if (e.key === 'x') {
          // Ctrl+X または Cmd+X でカット
          cutSelectedCells();
        }
        return;
      }
      
      // Enterキーが押された場合、選択中のセルを編集モードに変更
      if (e.key === 'Enter' && selectedCells.length === 1) {
        e.preventDefault();
        
        // 選択されているセルを特定
        const selectedCell = selectedCells[0];
        const rowIndex = selectedCell.rowIndex;
        const cellIndex = selectedCell.cellIndex;
        
        // テーブル内のすべてのセル要素を取得
        const cellElements = document.querySelectorAll('[contenteditable]');
        
        // 行と列のインデックスに基づいて対象のセル要素を計算
        const targetCellIndex = rowIndex * tableData.columns.length + cellIndex;
        const cellElement = cellElements[targetCellIndex] as HTMLElement;
        
        // セルが見つかったら編集モードに移行
        if (cellElement) {
          // フォーカスを設定
          cellElement.focus();
          
          // カーソルを末尾に配置
          const range = document.createRange();
          const selection = window.getSelection();
          
          if (cellElement.childNodes.length > 0) {
            const lastNode = cellElement.childNodes[cellElement.childNodes.length - 1];
            range.setStartAfter(lastNode);
          } else {
            range.setStart(cellElement, 0);
          }
          
          range.collapse(true);
          
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        return;
      }
      
      // 矢印キーでの移動処理
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        // 選択されたセルがない場合は、最初のセルを選択
        if (selectedCells.length === 0) {
          setSelectedCells([{ rowIndex: 0, cellIndex: 0 }]);
          setLastSelectedCell({ rowIndex: 0, cellIndex: 0 });
          e.preventDefault();
          return;
        }
        
        // 現在選択されているセルの位置を取得（最後に選択したセルまたは単一選択のセル）
        const currentCell = lastSelectedCell || selectedCells[0];
        let newRowIndex = currentCell.rowIndex;
        let newCellIndex = currentCell.cellIndex;
        
        // 矢印キーに応じて移動先を計算
        switch (e.key) {
          case 'ArrowUp':
            newRowIndex = Math.max(0, newRowIndex - 1);
            break;
          case 'ArrowDown':
            newRowIndex = Math.min(tableData.rows.length - 1, newRowIndex + 1);
            break;
          case 'ArrowLeft':
            newCellIndex = Math.max(0, newCellIndex - 1);
            break;
          case 'ArrowRight':
            newCellIndex = Math.min(tableData.columns.length - 1, newCellIndex + 1);
            break;
          case 'Tab':
            e.preventDefault(); // タブキーのデフォルト動作を防止
            if (e.shiftKey) {
              // Shift+Tabで左に移動
              if (newCellIndex > 0) {
                newCellIndex--;
              } else if (newRowIndex > 0) {
                // 行の先頭で前の行の末尾に移動
                newRowIndex--;
                newCellIndex = tableData.columns.length - 1;
              }
            } else {
              // Tabで右に移動
              if (newCellIndex < tableData.columns.length - 1) {
                newCellIndex++;
              } else if (newRowIndex < tableData.rows.length - 1) {
                // 行の末尾で次の行の先頭に移動
                newRowIndex++;
                newCellIndex = 0;
              }
            }
            break;
        }
        
        // Shiftキーが押されている場合は選択範囲を拡張
        if (e.shiftKey && e.key !== 'Tab') {
          // 最後に選択したセルを基準に選択範囲を計算
          const startRow = Math.min(lastSelectedCell?.rowIndex || 0, newRowIndex);
          const endRow = Math.max(lastSelectedCell?.rowIndex || 0, newRowIndex);
          const startCell = Math.min(lastSelectedCell?.cellIndex || 0, newCellIndex);
          const endCell = Math.max(lastSelectedCell?.cellIndex || 0, newCellIndex);
          
          const newSelection: CellPosition[] = [];
          
          // 選択範囲内のすべてのセルを選択
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCell; c <= endCell; c++) {
              newSelection.push({ rowIndex: r, cellIndex: c });
            }
          }
          
          setSelectedCells(newSelection);
          // lastSelectedCellは更新しない（選択の起点を維持）
        } else {
          // 通常の移動（選択範囲を拡張しない）
          setSelectedCells([{ rowIndex: newRowIndex, cellIndex: newCellIndex }]);
          setLastSelectedCell({ rowIndex: newRowIndex, cellIndex: newCellIndex });
        }
        
        e.preventDefault();
        return;
      }
      
      // 単一セル選択時に文字キーが押されたら編集モードに移行
      if (selectedCells.length === 1 && 
          // 制御キーやショートカットキーは除外
          !e.ctrlKey && !e.metaKey && !e.altKey && 
          // 一般的な入力キーのみ対象（1文字の入力キー）
          e.key.length === 1) {
        
        e.preventDefault();
        
        // 選択されているセルを特定
        const selectedCell = selectedCells[0];
        const rowIndex = selectedCell.rowIndex;
        const cellIndex = selectedCell.cellIndex;
        
        // テーブル内のすべてのセル要素を取得
        const cellElements = document.querySelectorAll('[contenteditable]');
        
        // 行と列のインデックスに基づいて対象のセル要素を計算
        // 各行にはcolumns.length個のセルがあるため、rowIndex * columns.length + cellIndexでセルのインデックスを計算
        const targetCellIndex = rowIndex * tableData.columns.length + cellIndex;
        const cellElement = cellElements[targetCellIndex] as HTMLElement;
        
        // セルが見つかったら編集モードに移行
        if (cellElement) {
          // フォーカスを設定
          cellElement.focus();
          
          // 既存の内容をクリアして新しい文字を入力
          cellElement.innerHTML = '';
          
          // キー入力をシミュレート（setTimeout を使用して非同期で実行）
          setTimeout(() => {
            document.execCommand('insertText', false, e.key);
          }, 0);
        }
      }
      
      // BackspaceまたはDeleteキーが押され、かつ選択されたセルがある場合
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCells.length > 0) {
        e.preventDefault();
        
        // 選択されたすべてのセルの内容をクリア
        const newData = [...tableData.rows];
        
        selectedCells.forEach((cell) => {
          if (newData[cell.rowIndex] && newData[cell.rowIndex].cells[cell.cellIndex]) {
            newData[cell.rowIndex].cells[cell.cellIndex].value = '';
          }
        });
        
        setTableData(prev => ({
          ...prev,
          rows: newData
        }));
      }
    };

    // イベントリスナーを追加
    document.addEventListener('keydown', handleKeyDown);
    
    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCells, tableData.rows, tableData.columns.length, lastSelectedCell, copySelectedCells, pasteFromClipboard, cutSelectedCells, history]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 行のドラッグ処理
    if (activeId.startsWith('row-') && overId.startsWith('row-')) {
      setTableData(prev => {
        const oldIndex = prev.rows.findIndex(row => row.id === activeId);
        const newIndex = prev.rows.findIndex(row => row.id === overId);
        
        if (oldIndex === -1 || newIndex === -1) return prev;
        
        const newRows = [...prev.rows];
        const [removed] = newRows.splice(oldIndex, 1);
        newRows.splice(newIndex, 0, removed);
        
        return {
          ...prev,
          rows: newRows
        };
      });
    }
    
    // 列のドラッグ処理
    if (activeId.startsWith('column-') && overId.startsWith('column-')) {
      setTableData(prev => {
        const oldIndex = prev.columns.findIndex(col => col.id === activeId);
        const newIndex = prev.columns.findIndex(col => col.id === overId);
        
        if (oldIndex === -1 || newIndex === -1) return prev;
        
        // 列の順序を更新
        const newColumns = [...prev.columns];
        const [removed] = newColumns.splice(oldIndex, 1);
        newColumns.splice(newIndex, 0, removed);
        
        // インデックスを更新
        const updatedColumns = newColumns.map((col, idx) => ({
          ...col,
          index: idx
        }));
        
        // 各行のセルを新しい列順序に合わせて並べ替え
        const updatedRows = prev.rows.map(row => {
          const newCells = updatedColumns.map(col => {
            const oldColIndex = prev.columns.findIndex(c => c.id === col.id);
            return row.cells[oldColIndex];
          });
          
          return {
            ...row,
            cells: newCells
          };
        });
        
        return {
          columns: updatedColumns,
          rows: updatedRows
        };
      });
    }
  };

  const addRow = () => {
    const newRowId = `row-${Date.now()}`;
    setTableData(prev => ({
      ...prev,
      rows: [
        ...prev.rows, 
        { 
          id: newRowId, 
          cells: prev.columns.map((_, i) => ({ 
            id: `cell-${newRowId}-${i}`, 
            value: '' 
          }))
        }
      ]
    }));
    setHistory([...history, tableData]);
  };

  const removeRow = (id: string) => {
    if (tableData.rows.length > 1) {
      setTableData(prev => ({
        ...prev,
        rows: prev.rows.filter(row => row.id !== id)
      }));
      setHistory([...history, tableData]);
    }
  };

  const addColumn = () => {
    const newColumnId = `column-${Date.now()}`;
    const newColumnIndex = tableData.columns.length;
    setTableData(prev => {
      // 新しい列を追加
      const updatedColumns = [
        ...prev.columns,
        { id: newColumnId, index: newColumnIndex, width: '200px' }
      ];
      
      // 各行に新しいセルを追加
      const updatedRows = prev.rows.map(row => ({
        ...row,
        cells: [
          ...row.cells,
          { id: `cell-${row.id}-${newColumnIndex}`, value: '' }
        ]
      }));
      
      return {
        columns: updatedColumns,
        rows: updatedRows
      };
    });
    setHistory([...history, tableData]);
  };

  const removeColumn = (columnId: string) => {
    if (tableData.columns.length > 1) {
      setTableData(prev => {
        const columnIndex = prev.columns.findIndex(col => col.id === columnId);
        if (columnIndex === -1) return prev;
        
        // 列を削除
        const updatedColumns = prev.columns.filter(col => col.id !== columnId);
        
        // インデックスを更新
        const reindexedColumns = updatedColumns.map((col, idx) => ({
          ...col,
          index: idx
        }));
        
        // 各行から対応するセルを削除
        const updatedRows = prev.rows.map(row => ({
          ...row,
          cells: row.cells.filter((_, idx) => idx !== columnIndex)
        }));
        
        return {
          columns: reindexedColumns,
          rows: updatedRows
        };
      });
    }
  };

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <div className={styles.toolbarGroup}>
          <button className={styles.addButton} onClick={addRow} title="行を追加">
            <AddRowIcon />
          </button>
          <button className={styles.addButton} onClick={addColumn} title="列を追加">
            <AddColumnIcon />
          </button>
        </div>

        <div className={styles.toolbarDivider}></div>

        <div className={styles.toolbarGroup}>
          <button 
            className={styles.undoButton} 
            onClick={handleUndo}
            disabled={history.length === 0}
            title="元に戻す (Ctrl+Z / ⌘+Z)"
          >
            <UndoIcon />
          </button>
        </div>

        {selectedCells.length > 0 && (
          <>
            <div className={styles.toolbarDivider}></div>
            <div className={styles.toolbarGroup}>
              <button className={styles.clearSelectionButton} onClick={clearSelection} title="選択解除">
                <ClearSelectionIcon />
              </button>
            </div>

            <div className={styles.toolbarDivider}></div>
            <div className={styles.toolbarGroup}>
              <button className={styles.copyButton} onClick={copySelectedCells} title="コピー (Ctrl+C / ⌘+C)">
                <CopyIcon />
              </button>
              <button className={styles.cutButton} onClick={cutSelectedCells} title="カット (Ctrl+X / ⌘+X)">
                <CutIcon />
              </button>
              <button className={styles.pasteButton} onClick={pasteFromClipboard} title="ペースト (Ctrl+V / ⌘+V)">
                <PasteIcon />
              </button>
            </div>

            <div className={styles.toolbarDivider}></div>
            <div className={styles.toolbarGroup}>
              <button className={styles.deleteButton} onClick={() => {
                // 選択されたセルの内容をクリア
                setTableData(prev => {
                  const newRows = [...prev.rows];
                  
                  selectedCells.forEach((cell) => {
                    if (newRows[cell.rowIndex] && newRows[cell.rowIndex].cells[cell.cellIndex]) {
                      newRows[cell.rowIndex].cells[cell.cellIndex].value = '';
                    }
                  });
                  
                  return {
                    ...prev,
                    rows: newRows
                  };
                });

                // 履歴に追加
                setHistory([...history, tableData]);
              }} title="削除 (Delete / Backspace)">
                <DeleteIcon />
              </button>
            </div>
          </>
        )}
      </div>
      
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className={styles.table}>
          <div className={styles.columnControlsContainer}>
            <div className={styles.rowHandleSpace}></div>
            
            <SortableContext items={tableData.columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
              <div className={styles.columnControls}>
                {tableData.columns.map((column) => (
                  <SortableColumn
                    key={column.id}
                    id={column.id}
                    width={column.width}
                    isFirst={column.index === 0}
                    onRemove={() => removeColumn(column.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
          
          <SortableContext items={tableData.rows.map(row => row.id)} strategy={verticalListSortingStrategy}>
            {tableData.rows.map((row, rowIndex) => (
              <EditableRow
                key={row.id}
                id={row.id}
                cells={row.cells}
                isHeader={rowIndex === 0}
                columnWidths={tableData.columns.map(col => col.width)}
                onCellChange={(cellId: string, value: string) => handleCellChange(row.id, cellId, value)}
                onRemove={() => removeRow(row.id)}
                onCellClick={(cellIndex, isShiftKey) => handleCellClick(rowIndex, cellIndex, isShiftKey)}
                getIsCellSelected={(cellIndex) => isCellSelected(rowIndex, cellIndex)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}