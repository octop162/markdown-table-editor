import { useEffect, useRef, useCallback } from 'react'

type KeyboardEventHandlers = {
  moveSelection: (direction: 'up' | 'down' | 'left' | 'right', forceNoShift?: boolean) => void
  setShiftKey: (pressed: boolean) => void
  copySelectedCells: () => void
  cutSelectedCells?: () => void
  pasteToSelectedCells: () => void
  startEditing: () => void
  stopEditing: (save?: boolean) => void
  clearSelectedCells: () => void
  isEditing: boolean
  showShortcutHelp?: () => void  // ショートカットヘルプ表示用
  undo?: () => void  // 元に戻す
  redo?: () => void  // やり直し
  selectAllCells?: () => void  // すべてのセルを選択
  clearSelection?: () => void  // 選択を解除
}

// セル編集情報の型定義
type CellEditInfo = {
  hasUserEdited: boolean
  // inputValueRef: React.MutableRefObject<string>
  // lastNotifiedValueRef: React.MutableRefObject<string>
  onEdit: (value: string) => void
}

/**
 * キーボードイベントを管理するカスタムフック
 * @param handlers イベントハンドラー
 */
export const useKeyboardEvents = (
  handlers: KeyboardEventHandlers,
  cellEditInfo?: CellEditInfo // Cellからの編集情報を受け取るパラメータを追加
) => {
  const isComposingRef = useRef(false)
  const pendingKeyRef = useRef<string | null>(null)
  const isEditingRef = useRef(handlers.isEditing)
  const handlersRef = useRef(handlers)
  const cellEditInfoRef = useRef<CellEditInfo | undefined>(cellEditInfo)
  const eventListenersAddedRef = useRef(false)

  // handlersとcellEditInfoの値が変わったときにrefを更新
  useEffect(() => {
    handlersRef.current = handlers
    isEditingRef.current = handlers.isEditing
  }, [handlers])

  useEffect(() => {
    cellEditInfoRef.current = cellEditInfo
  }, [cellEditInfo])

  // ハンドラーを更新する関数
  const updateHandlers = useCallback((newHandlers: Partial<KeyboardEventHandlers>) => {
    handlersRef.current = { ...handlersRef.current, ...newHandlers }
    isEditingRef.current = newHandlers.isEditing ?? isEditingRef.current
  }, [])

  // 保留中のキーを取得
  const getPendingKey = useCallback(() => {
    const key = pendingKeyRef.current
    pendingKeyRef.current = null
    return key
  }, [])

  // キーダウンイベントハンドラー
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    
    // 最新のハンドラーを使用
    const currentHandlers = handlersRef.current
    const currentCellEditInfo = cellEditInfoRef.current

    // 編集モード中の特別な処理
    if (isEditingRef.current) {
      // Escキーで編集キャンセル
      if (e.key === 'Escape') {
        e.preventDefault()
        currentHandlers.stopEditing(false)
        return
      }

      // Alt+Enterで改行を挿入
      if (e.key === 'Enter' && e.altKey) {
          e.preventDefault();
          document.execCommand('insertLineBreak');
          return;
      }

      // Enterキーで編集確定
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        currentHandlers.stopEditing(true)
        // Enterキーを押したら下のセルに移動
        currentHandlers.moveSelection('down')
        return
      }

      // Tabキーで編集確定して移動
      if (e.key === 'Tab') {
        e.preventDefault()
        currentHandlers.stopEditing(true)
        // Tabキーを押したら右のセルに移動（Shift+Tabなら左に移動）
        if (e.shiftKey) {
          // Shift+Tabの場合は、範囲選択を強制的に無効にして左に移動
          currentHandlers.moveSelection('left', true)
        } else {
          currentHandlers.moveSelection('right')
        }
        return;
      }
      return;
    } else {

      // 以下、編集モードでない場合の処理
      
      // Enter 押された場合編集モードにする
      if (currentCellEditInfo && ((e.key === 'Enter' && !e.shiftKey && !e.altKey) )) {
        currentHandlers.startEditing();
        return;
      }

      // IME入力中はキーボードイベントを処理しない
      if (isComposingRef.current) {
        console.log('IME composing, ignoring key event');
        return;
      }

      // Shiftキーの状態を追跡
      if (e.key === 'Shift') {
        currentHandlers.setShiftKey(true);
        return;
      }

      // Escキーで選択解除
      if (e.key === 'Escape') {
        e.preventDefault();
        if (currentHandlers.clearSelection) {
          currentHandlers.clearSelection();
        }
        return;
      }

      // Ctrl+A または Cmd+A ですべて選択
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        if (currentHandlers.selectAllCells) {
          currentHandlers.selectAllCells()
        }
        return
      }

      // Tabキーで右/左に移動
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tabの場合は、範囲選択を強制的に無効にして左に移動
          currentHandlers.moveSelection('left', true)
        } else {
          currentHandlers.moveSelection('right')
        }
        return
      }

      // 矢印キーでセル移動
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()

        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'
        currentHandlers.moveSelection(direction)
        return
      }

      // DeleteまたはBackspaceキーでセルクリア
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        currentHandlers.clearSelectedCells()
        return
      }

      // Ctrl+C または Cmd+C でコピー
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        currentHandlers.copySelectedCells()
        return
      }

      // Ctrl+X または Cmd+X でカット
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        if (currentHandlers.cutSelectedCells) {
          currentHandlers.cutSelectedCells()
        }
        return
      }

      // Ctrl+V または Cmd+V でペースト
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        currentHandlers.pasteToSelectedCells()
        return
      }

      // Ctrl+Z または Cmd+Z で元に戻す
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (currentHandlers.undo) {
          currentHandlers.undo()
        }
        return
      }

      // Ctrl+Y または Cmd+Y でやり直し
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        if (currentHandlers.redo) {
          currentHandlers.redo()
        }
        return
      }
    }
  }, []);

  // キーアップイベントハンドラー
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    // Shiftキーの状態を追跡
    if (e.key === 'Shift') {
      handlersRef.current.setShiftKey(false)
    }
  }, []);

  // IME入力の開始と終了を検知
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, []);

  // イベントリスナーの登録
  useEffect(() => {
    console.log('Setting up keyboard event listeners');
    
    // イベントリスナーが既に追加されている場合は追加しない
    if (eventListenersAddedRef.current) {
      console.log('Event listeners already added, skipping');
      return;
    }
    
    // イベントリスナーを登録
    document.addEventListener('keydown', handleKeyDown, true); // キャプチャフェーズで処理
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);
    
    // イベントリスナーが追加されたことを記録
    eventListenersAddedRef.current = true;
    
    // クリーンアップ
    return () => {
      console.log('Cleaning up keyboard event listeners');
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
      
      // イベントリスナーが削除されたことを記録
      eventListenersAddedRef.current = false;
    }
  }, [handleKeyDown, handleKeyUp, handleCompositionStart, handleCompositionEnd]);

  return {
    getPendingKey,
    updateHandlers
  }
} 