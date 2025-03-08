export type CellValue = string
export type CellData = {
  value: CellValue
  isEditing: boolean
  isSelected?: boolean
  width?: number // セルの幅（px単位）
}

export type TableData = CellData[][]

export type Position = {
  row: number
  col: number
}

export type Selection = {
  start: Position
  end: Position
}

// 履歴のアクション種類
export enum HistoryActionType {
  CELL_UPDATE = 'CELL_UPDATE',
  MULTIPLE_CELLS_UPDATE = 'MULTIPLE_CELLS_UPDATE',
  ADD_ROW = 'ADD_ROW',
  REMOVE_ROW = 'REMOVE_ROW',
  ADD_COLUMN = 'ADD_COLUMN',
  REMOVE_COLUMN = 'REMOVE_COLUMN',
  PASTE = 'PASTE',
  CUT = 'CUT'
}

// 履歴エントリの型定義
export type HistoryEntry = {
  actionType: HistoryActionType
  data: TableData
  timestamp: number
}

// 履歴スタックの型定義
export type HistoryStack = HistoryEntry[] 