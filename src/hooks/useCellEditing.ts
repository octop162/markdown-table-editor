import { useState, useCallback, useEffect, useRef } from 'react'
import { Position, TableData } from '../types/table'

/**
 * セル編集機能を管理するカスタムフック
 */
export const useCellEditing = (
  data: TableData,
  currentCell: Position | null,
  updateCell: (rowIndex: number, colIndex: number, value: string) => void,
  getPendingKey?: () => string | null
) => {
  const [editValue, setEditValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const isComposingRef = useRef(false)
  const prevCellRef = useRef<Position | null>(null)
  const initialEditValueRef = useRef<string>('')
  const editValueRef = useRef<string>('')  // 現在の編集値を参照するためのref
  const hasEditedRef = useRef(false)  // 編集されたかどうかを追跡するref

  // 現在のセルが変わったときに編集状態をリセット
  useEffect(() => {
    if (currentCell && !isEditing) {
      const { row, col } = currentCell
      const cellValue = data[row][col].value
      const stringValue = cellValue !== undefined ? String(cellValue) : ''
      setEditValue(stringValue)
      editValueRef.current = stringValue  // refも更新
      initialEditValueRef.current = stringValue
      hasEditedRef.current = false  // 編集フラグをリセット
    }

    // 編集中に別のセルに移動した場合、前のセルの編集を終了して保存
    // IME入力中は処理しない
    if (!isComposingRef.current && isEditing && currentCell && prevCellRef.current && 
        (prevCellRef.current.row !== currentCell.row || prevCellRef.current.col !== currentCell.col)) {
      const { row, col } = prevCellRef.current
      if (hasEditedRef.current) {
        updateCell(row, col, editValueRef.current)  // 最新の編集値を使用
      }
      setIsEditing(false)
      hasEditedRef.current = false  // 編集フラグをリセット
    }

    // 現在のセルを記録
    prevCellRef.current = currentCell
  }, [currentCell, data, isEditing, updateCell])

  /**
   * 編集を開始
   */
  const startEditing = useCallback(() => {
    console.log('startEditing called in useCellEditing, currentCell:', currentCell);
    if (!currentCell) {
      console.warn('Cannot start editing: no cell selected');
      return;
    }

    const { row, col } = currentCell;
    // 値を文字列に変換して設定
    const cellValue = data[row][col].value;
    let stringValue = cellValue !== undefined ? String(cellValue) : '';

    // 保留中のキー入力があれば、それを初期値として設定
    const pendingKey = getPendingKey?.();
    console.log('pendingKey:', pendingKey);
    
    if (pendingKey) {
      stringValue = pendingKey;
      hasEditedRef.current = true;  // 編集フラグを設定
    } else {
      // 保留中のキーがない場合は、セルの現在の値を使用
      initialEditValueRef.current = stringValue;
      hasEditedRef.current = false;  // 編集フラグをリセット
    }
    
    setIsEditing(true);
    console.log('Edit mode activated');
  }, [currentCell, data, getPendingKey])

  /**
   * 編集を終了
   * @param save 変更を保存するかどうか
   */
  const stopEditing = useCallback((save = true) => {
    if (!currentCell || !isEditing) return
    
    // IME入力中は編集を終了しない
    if (isComposingRef.current) return

    const { row, col } = currentCell

    if (save && hasEditedRef.current) {
      // 変更を保存（編集があった場合のみ）
      // 現在の編集値を使用して更新
      updateCell(row, col, editValueRef.current)  // 最新の編集値を使用
    } else if (!save) {
      // 編集をキャンセルした場合は元の値に戻す
      setEditValue(initialEditValueRef.current)
      editValueRef.current = initialEditValueRef.current  // refも更新
    }

    setIsEditing(false)
    hasEditedRef.current = false  // 編集フラグをリセット
  }, [currentCell, isEditing, updateCell])

  /**
   * 編集中の値を更新
   * @param value 新しい値
   */
  const handleEditChange = useCallback((value: string) => {
    if (value !== editValueRef.current) {
      setEditValue(value)
      editValueRef.current = value  // refも更新
      hasEditedRef.current = true  // 編集フラグを設定
    }
  }, [])

  /**
   * IME入力開始
   */
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  /**
   * IME入力終了
   */
  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
    // IME入力完了時に編集フラグを設定
    if (editValueRef.current !== initialEditValueRef.current) {
      hasEditedRef.current = true
    }
  }, [])

  /**
   * 選択されたセルの値をクリア
   */
  const clearSelectedCells = useCallback(() => {
    if (!currentCell) return

    const { row, col } = currentCell
    updateCell(row, col, '')
    setEditValue('')
    editValueRef.current = ''  // refも更新
    initialEditValueRef.current = ''
    hasEditedRef.current = false  // 編集フラグをリセット
  }, [currentCell, updateCell])

  return {
    editValue,
    isEditing,
    startEditing,
    stopEditing,
    handleEditChange,
    handleCompositionStart,
    handleCompositionEnd,
    clearSelectedCells,
    isComposing: isComposingRef.current
  }
} 