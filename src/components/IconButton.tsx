import React from 'react';
import { IconType, getIconPath } from '../types/icons';
import styles from './IconButton.module.css';

export type IconButtonProps = {
  iconType: IconType;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  label?: string;
  className?: string;
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
  className = ''
}) => {
  return (
    <button
      className={`${styles.iconButton} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      <img
        src={getIconPath(iconType)}
        alt={title}
        className={styles.icon}
      />
      {label && <span className={styles.label}>{label}</span>}
    </button>
  );
}; 