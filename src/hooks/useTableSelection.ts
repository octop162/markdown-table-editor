import { useState, useCallback, useRef } from 'react'
import { Position, Selection, TableData } from '../types/table'

/**
 * テーブルの選択状態を管理するカスタムフック
 * @returns 選択状態と操作関数
 */
export const useTableSelection = (data: TableData) => {
  const [currentCell, setCurrentCell] = useState<Position | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [selectionAnchor, setSelectionAnchor] = useState<Position | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<Position | null>(null)

  /**
   * セルが選択されているかどうかを判定
   * @param rowIndex 行インデックス
   * @param colIndex 列インデックス
   * @returns 選択されているかどうか
   */
  const isCellSelected = useCallback((rowIndex: number, colIndex: number): boolean => {
    if (!selection) return false

    const { start, end } = selection
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)

    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
  }, [selection])

  /**
   * セルが編集モードかどうかを判定
   * @param rowIndex 行インデックス
   * @param colIndex 列インデックス
   * @returns 編集モードかどうか
   */
  const isCellEditing = useCallback((rowIndex: number, colIndex: number): boolean => {
    return currentCell?.row === rowIndex && currentCell?.col === colIndex
  }, [currentCell])

  /**
   * セルを選択
   * @param rowIndex 行インデックス
   * @param colIndex 列インデックス
   */
  const selectCell = useCallback((rowIndex: number, colIndex: number, forceNoShift: boolean = false) => {
    // 現在のセルを更新
    setCurrentCell({ row: rowIndex, col: colIndex })
    
    if (isShiftPressed && selectionAnchor && !forceNoShift) {
      // Shiftキーが押されている場合は範囲選択
      setSelection({
        start: selectionAnchor,
        end: { row: rowIndex, col: colIndex }
      })
    } else {
      // 単一選択
      const newPosition = { row: rowIndex, col: colIndex }
      setSelectionAnchor(newPosition)
      setSelection({
        start: newPosition,
        end: newPosition
      })
    }
  }, [selectionAnchor, isShiftPressed])

  /**
   * マウスダウンイベントのハンドラー
   * @param rowIndex 行インデックス
   * @param colIndex 列インデックス
   * @param shiftKey Shiftキーが押されているかどうか
   */
  const handleMouseDown = useCallback((rowIndex: number, colIndex: number, shiftKey = false) => {
    const position = { row: rowIndex, col: colIndex }
    
    // Shiftキーが押されている場合は選択範囲を拡張
    if (shiftKey && selectionAnchor) {
      setCurrentCell(position)
      setSelection({
        start: selectionAnchor,
        end: position
      })
      // ドラッグ開始位置を設定（Shiftキーでの選択でもドラッグを可能にする）
      dragStartRef.current = position
      setIsDragging(true)
    } else {
      // 通常のクリック（単一選択）
      dragStartRef.current = position
      setIsDragging(true)
      
      // 現在のセルを更新
      setCurrentCell(position)
      
      // 単一選択で開始
      setSelectionAnchor(position)
      setSelection({
        start: position,
        end: position
      })
    }
  }, [selectionAnchor])

  /**
   * マウス移動イベントのハンドラー
   * @param rowIndex 行インデックス
   * @param colIndex 列インデックス
   */
  const handleMouseMove = useCallback((rowIndex: number, colIndex: number) => {
    if (!isDragging || !dragStartRef.current) return
    
    // ドラッグ中は選択範囲を更新
    setCurrentCell({ row: rowIndex, col: colIndex })
    setSelection({
      start: dragStartRef.current,
      end: { row: rowIndex, col: colIndex }
    })
  }, [isDragging])

  /**
   * マウスアップイベントのハンドラー
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  /**
   * 選択範囲をクリア
   */
  const clearSelection = useCallback(() => {
    setCurrentCell(null)
    setSelection(null)
    setSelectionAnchor(null)
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  /**
   * Shiftキーの状態を設定
   * @param pressed 押されているかどうか
   */
  const setShiftKey = useCallback((pressed: boolean) => {
    setIsShiftPressed(pressed)
  }, [])

  /**
   * 選択を移動
   * @param direction 移動方向
   * @param forceNoShift trueの場合、Shiftキーが押されていても範囲選択しない
   */
  const moveSelection = useCallback((
    direction: 'up' | 'down' | 'left' | 'right', 
    forceNoShift: boolean = false
  ) => {
    if (!currentCell) {
      // 現在のセルがない場合は最初のセルを選択
      selectCell(0, 0)
      return
    }

    const { row, col } = currentCell
    let newRow = row
    let newCol = col

    // 方向に応じて移動
    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1)
        break
      case 'down':
        newRow = Math.min(data.length - 1, row + 1)
        break
      case 'left':
        newCol = Math.max(0, col - 1)
        break
      case 'right':
        newCol = Math.min(data[0].length - 1, col + 1)
        break
    }

    // 移動先が現在のセルと同じ場合は何もしない
    if (newRow === row && newCol === col) return

    // 新しいセルを選択
    if (!forceNoShift && isShiftPressed && selectionAnchor) {
      // Shiftキーが押されている場合は選択範囲を拡張
      setCurrentCell({ row: newRow, col: newCol })
      setSelection({
        start: selectionAnchor,
        end: { row: newRow, col: newCol }
      })
    } else {
      // 単一選択
      selectCell(newRow, newCol, forceNoShift)
    }
  }, [currentCell, data, isShiftPressed, selectionAnchor, selectCell])

  /**
   * 選択されたセルの位置を取得
   * @returns 選択されたセルの位置の配列
   */
  const getSelectedCellPositions = useCallback((): Position[] => {
    if (!selection) return []

    const { start, end } = selection
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)

    const positions: Position[] = []
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        positions.push({ row, col })
      }
    }

    return positions
  }, [selection])

  /**
   * すべてのセルを選択
   */
  const selectAllCells = useCallback(() => {
    if (data.length === 0 || data[0].length === 0) return;
    
    const startPosition = { row: 0, col: 0 };
    const endPosition = { 
      row: data.length - 1, 
      col: data[0].length - 1 
    };
    
    setCurrentCell(startPosition);
    setSelectionAnchor(startPosition);
    setSelection({
      start: startPosition,
      end: endPosition
    });
  }, [data]);

  return {
    currentCell,
    selection,
    isShiftPressed,
    isDragging,
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
  }
} 