import { useState, useCallback } from 'react'
import { TableData, HistoryStack, HistoryEntry, HistoryActionType } from '../types/table'

/**
 * テーブル履歴を管理するカスタムフック
 * @param initialData 初期テーブルデータ
 * @returns 履歴関連の操作関数
 */
export const useTableHistory = (initialData: TableData) => {
  // 履歴スタック
  const [history, setHistory] = useState<HistoryStack>([
    {
      actionType: HistoryActionType.CELL_UPDATE,
      data: initialData,
      timestamp: Date.now()
    }
  ])
  
  // 現在の履歴位置
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  
  /**
   * 履歴に新しい状態を追加
   * @param actionType アクションの種類
   * @param data テーブルデータ
   */
  const addHistory = useCallback((actionType: HistoryActionType, data: TableData) => {
    // 現在の位置より後の履歴を削除し、新しい履歴を追加
    const newHistory = [
      ...history.slice(0, currentIndex + 1),
      {
        actionType,
        data: JSON.parse(JSON.stringify(data)), // ディープコピー
        timestamp: Date.now()
      }
    ]
    
    // 履歴が長すぎる場合は古いものを削除（最大50エントリ）
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    setHistory(newHistory)
    setCurrentIndex(newHistory.length - 1)
  }, [history, currentIndex])
  
  /**
   * 一つ前の状態に戻る
   * @returns 前の状態のテーブルデータ
   */
  const undo = useCallback((): TableData | null => {
    if (currentIndex <= 0) {
      return null // これ以上戻れない
    }
    
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex].data
  }, [history, currentIndex])
  
  /**
   * 一つ次の状態に進む
   * @returns 次の状態のテーブルデータ
   */
  const redo = useCallback((): TableData | null => {
    if (currentIndex >= history.length - 1) {
      return null // これ以上進めない
    }
    
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex].data
  }, [history, currentIndex])
  
  /**
   * 元に戻せるかどうか
   */
  const canUndo = currentIndex > 0
  
  /**
   * やり直せるかどうか
   */
  const canRedo = currentIndex < history.length - 1
  
  /**
   * 最新の履歴エントリを取得
   */
  const getCurrentHistoryEntry = useCallback((): HistoryEntry => {
    return history[currentIndex]
  }, [history, currentIndex])
  
  return {
    addHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentHistoryEntry
  }
} 