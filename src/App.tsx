import { Table } from './components/Table';
import { TableData } from './types/table';

const initialData: TableData = Array(5).fill(null).map(() =>
  Array(5).fill(null).map(() => ({
    value: '',
    isEditing: false,
    width: 80, // デフォルト幅を設定
  }))
)

function App() {
  return (
    <div className="app">
      <Table initialData={initialData} />
    </div>
  )
}

export default App
