import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import styles from './SortableColumn.module.css';

interface SortableColumnProps {
  id: string;
  width: string;
  isFirst: boolean;
  onRemove: () => void;
}

export default function SortableColumn({
  id,
  width,
  isFirst,
  onRemove,
}: SortableColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: width,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.columnControl}
      {...attributes}
      {...listeners}
    >
      <div className={styles.columnControlInner}>
        <div className={styles.columnDragHandle}>⋮</div>
        {!isFirst && (
          <button
            className={styles.removeColumnButton}
            onClick={onRemove}
            title="列を削除"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
} 