import { FC } from 'react';
import EditableTable from "./components/EditableTable";

// EditableTableで使用するデータ形式
interface EditableTableData {
  rows: {
    id: string;
    cells: { id: string; value: string }[];
  }[];
  columns: {
    id: string;
    index: number;
    width: string;
  }[];
}

interface AppProps {
  tableData: EditableTableData | null;
  onTableUpdate: (updatedData: EditableTableData) => void;
  onSaveTable: () => void;
}

const App: FC<AppProps> = ({ tableData, onTableUpdate, onSaveTable }) => {
  return (
    <div>
      {tableData ? (
        <EditableTable 
          initialData={tableData} 
          onUpdate={onTableUpdate}
          onSave={onSaveTable}
        />
      ) : (
        <div className="loading">テーブルデータを読み込み中...</div>
      )}
    </div>
  );
};

export default App;
