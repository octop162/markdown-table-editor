import { FC, useRef, useEffect, MouseEvent, useState, useCallback } from 'react'
import { Cell } from './Cell'
import { TableData } from '../types/table'
import styles from './Table.module.css'
import { useTableData } from '../hooks/useTableData'
import { useTableSelection } from '../hooks/useTableSelection'
import { useClipboard } from '../hooks/useClipboard'
import { useCellEditing } from '../hooks/useCellEditing'
import { useKeyboardEvents } from '../hooks/useKeyboardEvents'
import { convertToMarkdown } from '../utils/markdownConverter'
import { IconButton } from './IconButton'
import { IconType } from '../types/icons'

// VSCodeのテーマ情報の型定義
interface VSCodeTheme {
  isDark: boolean;
}

// グローバル変数の型拡張
declare global {
  interface Window {
    VS_CODE_THEME?: VSCodeTheme;
  }
}

type TableProps = {
  initialData: TableData,
  onSave: (markdown: string) => void
}

// 文字揃えの型定義
type TextAlign = 'left' | 'center' | 'right'

// 文字揃えボタンの定義
type AlignButton = {
  align: TextAlign
  icon: IconType
  title: string
}

// 文字揃えボタンの定義
const alignButtons: AlignButton[] = [
  { align: 'left', icon: IconType.ALIGN_LEFT, title: '左揃え' },
  { align: 'center', icon: IconType.ALIGN_CENTER, title: '中央揃え' },
  { align: 'right', icon: IconType.ALIGN_RIGHT, title: '右揃え' },
]

export const Table: FC<TableProps> = ({ initialData, onSave }) => {
  const tableRef = useRef<HTMLDivElement>(null)
  // 初期データから文字揃え情報を取得
  const [columnAligns, setColumnAligns] = useState<TextAlign[]>(() => {
    // 初期データから各列の文字揃え情報を取得
    if (initialData.length > 0 && initialData[0].length > 0) {
      return initialData[0].map(cell => 
        (cell.align as TextAlign) || 'left'
      );
    }
    return Array(initialData[0]?.length || 0).fill('left');
  });
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  
  // VSCodeのテーマ情報を取得
  useEffect(() => {
    const theme = window.VS_CODE_THEME;
    if (theme) {
      setIsDarkTheme(theme.isDark);
    }
  }, []);
  
  // セル編集情報のための参照
  const hasUserEditedRef = useRef(false)
  const inputValueRef = useRef('')
  const lastNotifiedValueRef = useRef('')

  // テーブルデータの管理
  const {
    data,
    updateCell,
    updateMultipleCells,
    updateMultipleCellsWithDifferentValues,
    updateAllCellWidths,
    addRow,
    addColumn,
    addMultipleRows,
    addMultipleColumns,
    removeRow,
    removeColumn,
    undoAction,
    redoAction,
    canUndo,
    canRedo
  } = useTableData(initialData)

  // 初期表示時にセル幅を自動調整
  useEffect(() => {
    updateAllCellWidths()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 選択状態の管理
  const {
    currentCell,
    selection,
    isCellSelected,
    isCellEditing,
    selectCell,
    setShiftKey,
    moveSelection,
    getSelectedCellPositions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    clearSelection,
    selectAllCells
  } = useTableSelection(data)

  // 選択されたセルをクリア
  const clearSelectedCells = () => {
    if (!selection) return

    const positions = getSelectedCellPositions()
    updateMultipleCells(positions, '')
  }

  // ショートカットヘルプを表示
  const showShortcutHelp = () => {
    // 削除
  }

  // クリップボード操作の管理
  const {
    copySelectedCells,
    cutSelectedCells,
    pasteToSelectedCells
  } = useClipboard({
    tableData: data,
    selectedCells: selection,
    currentCell,
    updateMultipleCells,
    updateMultipleCellsWithDifferentValues,
    getSelectedCellPositions,
    addMultipleRows,
    addMultipleColumns
  })

  // 行を安全に削除（選択状態を考慮）
  const safeRemoveRow = () => {
    if (data.length <= 1) return

    // 最後の行が選択されているかチェック
    const lastRowIndex = data.length - 1
    const isLastRowSelected = selection &&
      (Math.min(selection.start.row, selection.end.row) <= lastRowIndex &&
        Math.max(selection.start.row, selection.end.row) >= lastRowIndex)

    // 最後の行が選択されている場合は選択を解除
    if (isLastRowSelected) {
      clearSelection()
    }

    // 行を削除
    removeRow()
  }

  // 列を安全に削除（選択状態を考慮）
  const safeRemoveColumn = () => {
    if (data[0].length <= 1) return

    // 最後の列が選択されているかチェック
    const lastColIndex = data[0].length - 1
    const isLastColSelected = selection &&
      (Math.min(selection.start.col, selection.end.col) <= lastColIndex &&
        Math.max(selection.start.col, selection.end.col) >= lastColIndex)

    // 最後の列が選択されている場合は選択を解除
    if (isLastColSelected) {
      clearSelection()
    }

    // 列を削除
    removeColumn()
  }

  // セル値が変更されたときの処理
  const handleCellEdit = (value: string) => {
    if (currentCell) {
      inputValueRef.current = value
      hasUserEditedRef.current = true
      updateCell(currentCell.row, currentCell.col, value)
    }
  }

  // キーボードイベントの管理（初期設定）
  const { getPendingKey, updateHandlers } = useKeyboardEvents(
    data, 
    {
      moveSelection,
      setShiftKey,
      copySelectedCells,
      cutSelectedCells,
      pasteToSelectedCells,
      startEditing: () => {
        console.log('startEditing called from useKeyboardEvents');
        startEditing();
      },
      stopEditing: (save = true) => {
        console.log('stopEditing called from useKeyboardEvents, save:', save);
        stopEditing(save);
      },
      clearSelectedCells,
      isEditing: false, // 初期状態
      showShortcutHelp,
      undo: undoAction,
      redo: redoAction,
      selectAllCells,
      clearSelection
    },
    // セル編集情報を渡す
    {
      hasUserEdited: hasUserEditedRef.current,
      onEdit: handleCellEdit
    }
  )

  // セル編集の管理
  const {
    isEditing,
    startEditing,
    stopEditing,
    handleCompositionStart,
    handleCompositionEnd
  } = useCellEditing(data, currentCell, updateCell, getPendingKey)

  // セル編集情報の更新
  useEffect(() => {
    if (currentCell && !isEditing) {
      const { row, col } = currentCell
      const cellValue = data[row][col].value
      const stringValue = cellValue !== undefined ? String(cellValue) : ''
      inputValueRef.current = stringValue
      lastNotifiedValueRef.current = stringValue
      hasUserEditedRef.current = false
    }
  }, [currentCell, data, isEditing])

  // ハンドラーを更新
  useEffect(() => {
    updateHandlers({
      isEditing,
      startEditing,
      stopEditing,
      copySelectedCells,
      cutSelectedCells,
      pasteToSelectedCells,
      showShortcutHelp,
      undo: undoAction,
      redo: redoAction,
      selectAllCells,
      clearSelection
    })
  }, [isEditing, startEditing, stopEditing, copySelectedCells, cutSelectedCells, pasteToSelectedCells, updateHandlers, undoAction, redoAction, selectAllCells, clearSelection])

  // マウスダウンイベントハンドラー（Shiftキーの状態を取得）
  const handleCellMouseDown = (e: MouseEvent<HTMLDivElement>, rowIndex: number, colIndex: number) => {
    handleMouseDown(rowIndex, colIndex, e.shiftKey)
  }

  // 列の文字揃えを変更する
  const handleAlignChange = (align: TextAlign, colIndex: number) => {
    // 選択範囲がある場合は、選択されている列すべての文字揃えを変更
    if (selection) {
      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);

      // 選択範囲内の列すべての文字揃えを変更
      const newColumnAligns = [...columnAligns];
      for (let col = startCol; col <= endCol; col++) {
        newColumnAligns[col] = align;
      }
      setColumnAligns(newColumnAligns);
    } else if (currentCell) {
      // 選択範囲がない場合は、現在のセルの列の文字揃えを変更
      const newColumnAligns = [...columnAligns];
      newColumnAligns[colIndex] = align;
      setColumnAligns(newColumnAligns);
    }
  }

  // セルのレンダリング
  const renderCell = (rowIndex: number, colIndex: number) => {
    const cell = data[rowIndex][colIndex]
    const selected = isCellSelected(rowIndex, colIndex)
    const editing = isCellEditing(rowIndex, colIndex) && isEditing
    const width = cell.width || 100
    const textAlign = columnAligns[colIndex]

    return (
      <Cell
        key={`${rowIndex}-${colIndex}`}
        value={cell.value}
        isEditing={editing}
        isSelected={selected}
        width={width}
        onEdit={(value) => {
          handleCellEdit(value)
          lastNotifiedValueRef.current = value
        }}
        onSelect={() => selectCell(rowIndex, colIndex)}
        onKeyDown={getPendingKey}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onDoubleClick={() => startEditing()}
        onMouseDown={(e) => handleCellMouseDown(e, rowIndex, colIndex)}
        onMouseMove={() => handleMouseMove(rowIndex, colIndex)}
        onMouseEnter={() => handleMouseMove(rowIndex, colIndex)}
        onMouseUp={handleMouseUp}
        textAlign={textAlign}
        onAlignChange={(align) => handleAlignChange(align, colIndex)}
        onStartEditing={startEditing}
      />
    )
  }

  // 行を生成
  const renderRows = () => {
    return data.map((row, rowIndex) => (
      <tr key={rowIndex} style={{ height: '36px' }}>
        {row.map((_, colIndex) => {
          const selected = isCellSelected(rowIndex, colIndex);
          return (
            <td
              key={colIndex}
              className={`${styles.cell} ${selected ? styles.selectedCell : ''}`}
              style={{ 
                padding: 0, 
                borderSpacing: 0,
                width: data[rowIndex][colIndex].width || 100,
                height: '100%',
                minHeight: '36px'
              }}
            >
              {renderCell(rowIndex, colIndex)}
            </td>
          );
        })}
      </tr>
    ))
  }

  // ツールバーを生成
  const renderToolbar = () => {
    return (
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <IconButton
            iconType={IconType.COPY}
            onClick={copySelectedCells}
            disabled={!selection}
            title="Copy (Ctrl+C)"
            category="edit"
          />
          <IconButton
            iconType={IconType.CUT}
            onClick={cutSelectedCells}
            disabled={!selection}
            title="Cut (Ctrl+X)"
            category="edit"
          />
          <IconButton
            iconType={IconType.PASTE}
            onClick={() => {
              if (currentCell) {
                pasteToSelectedCells()
              }
            }}
            disabled={!currentCell}
            title="Paste (Ctrl+V)"
            category="edit"
          />
          <IconButton
            iconType={IconType.SELECT_ALL}
            onClick={selectAllCells}
            title="Select All (Ctrl+A)"
            category="edit"
          />
          <IconButton
            iconType={IconType.CLEAR_SELECTION}
            onClick={clearSelectedCells}
            disabled={!selection}
            title="Clear Selection (Delete)"
            category="edit"
          />
        </div>

        <div className={styles.divider}></div>

        <div className={styles.toolbarGroup}>
          <IconButton
            iconType={IconType.ADD_ROW}
            onClick={addRow}
            title="Add Row"
            category="structure"
          />
          <IconButton
            iconType={IconType.ADD_COLUMN}
            onClick={addColumn}
            title="Add Column"
            category="structure"
          />
          <IconButton
            iconType={IconType.REMOVE_ROW}
            onClick={safeRemoveRow}
            disabled={data.length <= 1}
            title="Remove Row"
            category="structure"
          />
          <IconButton
            iconType={IconType.REMOVE_COLUMN}
            onClick={safeRemoveColumn}
            disabled={data[0].length <= 1}
            title="Remove Column"
            category="structure"
          />
        </div>

        <div className={styles.divider}></div>

        <div className={styles.toolbarGroup}>
          <IconButton
            iconType={IconType.UNDO}
            onClick={undoAction}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            category="history"
          />
          <IconButton
            iconType={IconType.REDO}
            onClick={redoAction}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            category="history"
          />
        </div>

        <div className={styles.divider}></div>

        <div className={styles.toolbarGroup}>
          {alignButtons.map((button) => (
            <IconButton
              key={button.align}
              iconType={button.icon}
              onClick={() => {
                if (currentCell) {
                  handleAlignChange(button.align, currentCell.col)
                }
              }}
              disabled={!currentCell}
              className={
                currentCell &&
                  (selection
                    ? isAlignActiveForSelection(button.align)
                    : columnAligns[currentCell.col] === button.align)
                  ? styles.active : ''
              }
              active={
                currentCell &&
                (selection
                  ? isAlignActiveForSelection(button.align)
                  : columnAligns[currentCell.col] === button.align) || false
              }
              title={button.title}
              category="format"
            />
          ))}
        </div>

        <div className={styles.divider}></div>

        <div className={styles.toolbarGroup}>
          <IconButton
            iconType={IconType.UPDATE_WIDTH}
            onClick={updateAllCellWidths}
            title="Auto Adjust Width"
            category="format"
          />
        </div>

        <div className={styles.divider}></div>

        <div className={styles.toolbarGroup}>
          <IconButton
            iconType={IconType.SAVE}
            onClick={() => {
              const markdown = convertToMarkdown(data, columnAligns)
              onSave(markdown);
            }}
            title="Save"
            category="save"
          />
        </div>
      </div>
    )
  }

  // 選択範囲内のすべての列が同じ文字揃えかどうかをチェック
  const isAlignActiveForSelection = (align: TextAlign): boolean => {
    if (!selection || !currentCell) return false;

    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);

    // 選択範囲内のすべての列が同じ文字揃えかどうかをチェック
    for (let col = startCol; col <= endCol; col++) {
      if (columnAligns[col] !== align) {
        return false;
      }
    }

    return true;
  }

  // テーブルにフォーカスを設定する関数
  const focusTable = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.focus();
    }
  }, []);

  // テーブルがマウントされたときにフォーカスを設定
  useEffect(() => {
    focusTable();
  }, [focusTable]);

  // テーブルがクリックされたときにフォーカスを設定
  const handleTableClick = useCallback(() => {
    focusTable();
  }, [focusTable]);

  return (
    <div
      ref={tableRef}
      tabIndex={0}
      className={`${styles.tableWrapper} ${isDarkTheme ? styles.darkTheme : ''}`}
      onMouseUp={handleMouseUp}
      onClick={handleTableClick}
    >
      {renderToolbar()}

      <div className={styles.tableContainer}>
        <table className={styles.table} cellSpacing="0" cellPadding="0">
          <tbody>
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  )
} 