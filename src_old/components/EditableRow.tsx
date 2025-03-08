import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditableCell from './EditableCell';
import styles from './EditableRow.module.css';

interface EditableRowProps {
  id: string;
  cells: { id: string; value: string }[];
  isHeader: boolean;
  columnWidths: string[];
  onCellChange: (cellId: string, value: string) => void;
  onRemove: () => void;
  onCellClick: (cellIndex: number, isShiftKey: boolean) => void;
  getIsCellSelected: (cellIndex: number) => boolean;
}

export default function EditableRow({
  id,
  cells,
  isHeader,
  columnWidths,
  onCellChange,
  onRemove,
  onCellClick,
  getIsCellSelected,
}: EditableRowProps) {
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
  };

  const gridTemplateColumns = columnWidths.join(' ');

  return (
    <div ref={setNodeRef} style={style} className={styles.row}>
      <div className={styles.rowControls}>
        <div className={styles.rowControlsInner}>
          <div
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
          >
            ⋮
          </div>
          {!isHeader && (
            <button
              className={styles.removeButton}
              onClick={onRemove}
              title="行を削除"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className={styles.cells} style={{ gridTemplateColumns }}>
        {cells.map((cell, cellIndex) => (
          <EditableCell
            key={cell.id}
            id={cell.id}
            value={cell.value}
            isHeader={isHeader}
            isSelected={getIsCellSelected(cellIndex)}
            onChange={(value) => onCellChange(cell.id, value)}
            onClick={(isShiftKey) => onCellClick(cellIndex, isShiftKey)}
          />
        ))}
      </div>
    </div>
  );
}
