import React from 'react';
import { IconType, getIconPath } from '../types/icons';
import styles from './IconButton.module.css';

// カテゴリの型定義
export type ButtonCategory = 'edit' | 'structure' | 'history' | 'format' | 'save';

export type IconButtonProps = {
  iconType: IconType;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  label?: string;
  className?: string;
  category?: ButtonCategory; // カテゴリを追加
  active?: boolean; // アクティブ状態を追加
};

/**
 * アイコンボタンコンポーネント
 */
export const IconButton: React.FC<IconButtonProps> = ({
  iconType,
  onClick,
  disabled = false,
  title = '',
  label,
  className = '',
  category,
  active = false
}) => {
  // カテゴリに基づいたクラス名を生成
  const categoryClass = category ? styles[category] : '';
  const activeClass = active ? styles.active : '';
  
  return (
    <button
      className={`${styles.iconButton} ${categoryClass} ${activeClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      aria-label={title}
    >
      <img
        src={getIconPath(iconType)}
        alt={title}
        className={styles.icon}
      />
      {label && <span className={styles.label}>{label}</span>}
      {title && <span className={styles.tooltip}>{title}</span>}
    </button>
  );
}; 