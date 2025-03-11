import React, { FC, KeyboardEvent, useState, useEffect, useRef, CSSProperties, MouseEvent } from 'react'
import styles from './Cell.module.css'

// 文字揃えの型定義
type TextAlign = 'left' | 'center' | 'right'

type CellProps = {
  value: string
  isEditing: boolean
  isSelected: boolean
  width?: number
  onEdit: (value: string) => void
  onSelect: () => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLDivElement | HTMLTextAreaElement>) => void
  onCompositionStart?: () => void
  onCompositionEnd?: () => void
  onDoubleClick?: () => void
  onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void
  onMouseMove?: () => void
  onMouseUp?: () => void
  onMouseEnter?: () => void
  onAlignChange?: (align: TextAlign) => void
  textAlign?: TextAlign
  onStartEditing?: () => void
}

export const Cell: FC<CellProps> = ({
  value,
  isEditing,
  isSelected,
  width,
  onEdit,
  onSelect,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onDoubleClick,
  onMouseDown,
  onMouseMove,
  onMouseEnter,
  onMouseUp,
  textAlign = 'left',
}) => {
  const editableRef = useRef<HTMLDivElement>(null)
  const [prevIsEditing, setPrevIsEditing] = useState(isEditing)
  const [prevValue, setPrevValue] = useState(value)
  const [hasUserEdited, setHasUserEdited] = useState(false)
  const isComposingRef = useRef(false)
  const inputValueRef = useRef(value || '')  // 入力値を参照するためのref
  const lastNotifiedValueRef = useRef(value || '')  // 最後に通知した値を記録するref

  // セルのスタイルを計算
  const cellStyle: CSSProperties = {
    width: width ? `${width}px` : undefined,
    minWidth: width ? `${width}px` : '80px',
    maxWidth: width ? `${width}px` : undefined,
    textAlign: textAlign,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    flex: 1
  }

  // 編集モードでないときのセルコンテンツのスタイル
  const contentStyle: CSSProperties = {
    textAlign: textAlign,
    width: '100%',
    height: '100%'
  }

  // 編集モードが変わったとき、または値が変わったときに入力値を更新
  useEffect(() => {
    // 編集モードが開始されたとき、または編集モードでなく値が変わったときだけ入力値を更新
    if (!prevIsEditing && isEditing) {
      // 編集モードが開始された場合
      inputValueRef.current = value || ''
      lastNotifiedValueRef.current = value || ''
      setHasUserEdited(false)
      
      // フォーカスを当てて、テキストを全選択
      setTimeout(() => {
        if (editableRef.current) {
          // HTMLに変換して設定
          editableRef.current.innerHTML = convertToHtml(value || '')
          editableRef.current.focus()
          
          // テキストを全選択
          const selection = window.getSelection()
          const range = document.createRange()
          range.selectNodeContents(editableRef.current)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 0)
    } else if (!isEditing && prevValue !== value) {
      // 編集モードでなく、propsの値が変わった場合
      inputValueRef.current = value || ''
      lastNotifiedValueRef.current = value || ''
      setHasUserEdited(false)
    }
    
    setPrevIsEditing(isEditing)
    setPrevValue(value)
  }, [isEditing, value, prevIsEditing, prevValue])

  // 編集モードが終了するときに値を確実に親に通知
  useEffect(() => {
    if (prevIsEditing && !isEditing && hasUserEdited) {
      // 編集モードが終了した場合、変更があれば親に通知
      if (inputValueRef.current !== lastNotifiedValueRef.current) {
        onEdit(inputValueRef.current)
        lastNotifiedValueRef.current = inputValueRef.current
      }
    }
  }, [isEditing, prevIsEditing, hasUserEdited, onEdit])

  // HTMLをプレーンテキストに変換する関数
  const convertHtmlToPlainText = (html: string): string => {
    // <br>タグを改行に変換
    const withLineBreaks = html.replace(/<br\s*\/?>/gi, '\n');
    
    // その他のHTMLタグを除去
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = withLineBreaks;
    
    // innerTextまたはtextContentを使用してテキストを取得
    return tempDiv.innerText || tempDiv.textContent || '';
  }

  // テキストをHTMLに変換する関数（改行をbrタグに変換）
  const convertToHtml = (text: string): string => {
    return text.replace(/\n/g, '<br>')
  }

  // 入力値の変更を処理
  const handleInput = () => {
    if (editableRef.current) {
      // IME入力中は処理しない
      if (isComposingRef.current) {
        return;
      }
      
      // HTMLを取得して正規化
      const newValue = editableRef.current.innerHTML

      // 正規化したHTMLを設定
      if (editableRef.current.innerHTML !== newValue) {
        // カーソル位置を保存
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        const offset = range?.startOffset || 0
        
        // HTMLを更新
        editableRef.current.innerHTML = newValue
        
        // カーソル位置を復元
        if (selection && range) {
          try {
            // テキストノードを取得
            const textNode = editableRef.current.firstChild || editableRef.current
            const newRange = document.createRange()
            // カーソル位置を設定
            newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0))
            newRange.setEnd(textNode, Math.min(offset, textNode.textContent?.length || 0))
            selection.removeAllRanges()
            selection.addRange(newRange)
          } catch (e) {
            console.error('カーソル位置の復元に失敗しました', e)
          }
        }
      }
      
      // プレーンテキストに変換
      const plainText = convertHtmlToPlainText(newValue)
      
      // 入力値を更新
      inputValueRef.current = plainText
      setHasUserEdited(true)
      
      // 親コンポーネントに通知
      onEdit(plainText)
      lastNotifiedValueRef.current = plainText
    }
  }

  // IME入力開始
  const handleCompositionStart = () => {
    isComposingRef.current = true
    if (onCompositionStart) {
      onCompositionStart()
    }
  }

  // IME入力終了
  const handleCompositionEnd = () => {
    // IME入力完了フラグを設定
    isComposingRef.current = false;
    
    if (onCompositionEnd) {
      onCompositionEnd();
    }
    
    // IME入力完了時に親コンポーネントに通知
    if (editableRef.current) {
      // 少し遅延させて、IME確定後の値を取得
      setTimeout(() => {
        if (editableRef.current) {
          // HTMLを取得して正規化
          const newValue = editableRef.current.innerHTML;
          
          // 正規化したHTMLを設定
          if (editableRef.current.innerHTML !== newValue) {
            editableRef.current.innerHTML = newValue;
          }
          
          // プレーンテキストに変換
          const plainText = convertHtmlToPlainText(newValue);
          
          // 入力値を更新（末尾の改行を保持）
          inputValueRef.current = plainText;
          setHasUserEdited(true);
          onEdit(plainText);
          lastNotifiedValueRef.current = plainText;
        }
      }, 0);
    }
  };

  // フォーカスが外れたときの処理
  const handleBlur = () => {
    // 編集中の場合のみ処理
    if (isEditing && hasUserEdited && editableRef.current) {
      // HTMLを取得して正規化
      const newValue = editableRef.current.innerHTML;
      
      // 正規化したHTMLを設定
      if (editableRef.current.innerHTML !== newValue) {
        editableRef.current.innerHTML = newValue;
      }
      
      // プレーンテキストに変換
      const plainText = convertHtmlToPlainText(newValue);
      
      // 入力値を更新（末尾の改行を保持）
      if (plainText !== lastNotifiedValueRef.current) {
        inputValueRef.current = plainText;
        onEdit(plainText);
        lastNotifiedValueRef.current = plainText;
      }
    }
  };

  // クリックイベントの処理
  const handleClick = () => {
    onSelect()
  }

  // ダブルクリック時の処理
  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick()
    }
  }

  // マウスダウン時の処理
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // 左クリックのみ処理
    if (e.button === 0 && onMouseDown) {
      onMouseDown(e)
    }
  }

  // マウスムーブ時の処理
  const handleMouseMove = () => {
    if (onMouseMove) {
      onMouseMove()
    }
  }

  // マウスエンター時の処理
  const handleMouseEnter = (e: React.MouseEvent) => {
    // マウスボタンが押されている場合のみ処理
    if (e.buttons === 1 && onMouseEnter) {
      onMouseEnter()
    }
  }

  // マウスアップ時の処理
  const handleMouseUp = () => {
    if (onMouseUp) {
      onMouseUp()
    }
  }

  return (
    <div
      className={`${styles.cell} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onKeyDown={onKeyDown}
      tabIndex={isSelected && !isEditing ? 0 : -1}
      style={cellStyle}
    >
      {isEditing ? (
        <div
          ref={editableRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className={`${styles.cellInput} ${styles.editing}`}
          style={contentStyle}
        />
      ) : (
        <div className={styles.cellContent} style={contentStyle}>
          {value}
        </div>
      )}
    </div>
  )
}