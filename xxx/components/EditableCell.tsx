import { useRef } from 'react';
import styles from './EditableCell.module.css';

interface EditableCellProps {
  id: string;
  value: string;
  isHeader: boolean;
  isSelected: boolean;
  onChange: (value: string) => void;
  onClick: (isShiftKey: boolean) => void;
}

export default function EditableCell({
  value,
  isHeader,
  isSelected,
  onChange,
  onClick,
}: EditableCellProps) {

  const cellRef = useRef<HTMLDivElement>(null);

  // contentEditableはonChangeで検知できないためonBlurでステートを更新する
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // innerHTML（HTML形式）からテキスト内容を取得し、<br>タグを改行文字に変換
    const htmlContent = e.target.innerHTML || '';
    const newValue = htmlContent
      .replace(/<br\s*\/?>/gi, '\n') // <br>タグを改行文字に変換
      .replace(/<div>/gi, '\n')      // <div>タグを改行文字に変換
      .replace(/<\/div>/gi, '')      // </div>タグを削除
      .replace(/&nbsp;/gi, ' ');     // &nbsp;を半角スペースに変換
    
    onChange(newValue);
  };

  // クリックイベントを処理
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Shiftキーが押されているかどうかを確認
    onClick(e.shiftKey);
  };

  // キーダウンイベントを処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Shift+Enterキーが押されたときに改行を挿入
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      return false;
    }
    
    // Enter単体が押されたときに編集を完了し、フォーカスを外す
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // 現在の内容を保存
      const htmlContent = e.currentTarget.innerHTML || '';
      const newValue = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<div>/gi, '\n')
        .replace(/<\/div>/gi, '')
        .replace(/&nbsp;/gi, ' ');
      
      onChange(newValue);
      
      // フォーカスを外す
      cellRef.current?.blur();
      return false;
    }
  };

  return (
    <div
      ref={cellRef}
      className={`${styles.cell} ${isHeader ? styles.header : ''} ${isSelected ? styles.selected : ''}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, '<br>') }}
    />
  );
} 