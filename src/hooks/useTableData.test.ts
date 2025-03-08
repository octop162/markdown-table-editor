import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTableData } from './useTableData'
import { TableData } from '../types/table'
import * as cellWidthCalculator from '../utils/cellWidthCalculator'

// モックの設定
vi.mock('../utils/cellWidthCalculator', () => ({
  calculateColumnWidths: vi.fn().mockReturnValue([100, 120])
}))

describe('useTableData', () => {
  let initialData: TableData

  beforeEach(() => {
    // テスト用の初期データをリセット
    initialData = [
      [
        { value: 'セル1', isEditing: false },
        { value: 'セル2', isEditing: false }
      ],
      [
        { value: 'セル3', isEditing: false },
        { value: 'セル4', isEditing: false }
      ]
    ]
    
    // モックをリセット
    vi.clearAllMocks()
  })

  it('初期データが正しく設定されること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    expect(result.current.data).toEqual(initialData)
  })

  it('updateCell: セルの値を更新できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.updateCell(0, 1, '新しい値')
    })
    
    expect(result.current.data[0][1].value).toBe('新しい値')
    // 他のセルは変更されていないことを確認
    expect(result.current.data[0][0].value).toBe('セル1')
    expect(result.current.data[1][0].value).toBe('セル3')
    expect(result.current.data[1][1].value).toBe('セル4')
  })

  it('updateMultipleCells: 複数のセルを一度に更新できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.updateMultipleCells([
        { row: 0, col: 0 },
        { row: 1, col: 1 }
      ], '更新値')
    })
    
    expect(result.current.data[0][0].value).toBe('更新値')
    expect(result.current.data[1][1].value).toBe('更新値')
    // 他のセルは変更されていないことを確認
    expect(result.current.data[0][1].value).toBe('セル2')
    expect(result.current.data[1][0].value).toBe('セル3')
  })

  it('setCellWidth: セルの幅を設定できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.setCellWidth(1, 150)
    })
    
    // 同じ列のすべてのセルの幅が更新されていることを確認
    expect(result.current.data[0][1].width).toBe(150)
    expect(result.current.data[1][1].width).toBe(150)
    // 他の列のセルは変更されていないことを確認
    expect(result.current.data[0][0].width).toBeUndefined()
    expect(result.current.data[1][0].width).toBeUndefined()
  })

  it('updateAllCellWidths: すべてのセルの幅を自動調整できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.updateAllCellWidths()
    })
    
    // calculateColumnWidthsが呼ばれたことを確認
    expect(cellWidthCalculator.calculateColumnWidths).toHaveBeenCalledWith(initialData)
    
    // 各列のセルの幅が計算結果に基づいて更新されていることを確認
    expect(result.current.data[0][0].width).toBe(100)
    expect(result.current.data[1][0].width).toBe(100)
    expect(result.current.data[0][1].width).toBe(120)
    expect(result.current.data[1][1].width).toBe(120)
  })

  it('addRow: 行を追加できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.addRow()
    })
    
    // 行数が増えていることを確認
    expect(result.current.data.length).toBe(3)
    // 新しい行のセルが正しく初期化されていることを確認
    expect(result.current.data[2][0].value).toBe('')
    expect(result.current.data[2][1].value).toBe('')
    expect(result.current.data[2][0].isEditing).toBe(false)
    expect(result.current.data[2][1].isEditing).toBe(false)
  })

  it('addColumn: 列を追加できること', () => {
    const { result } = renderHook(() => useTableData([
      [{ value: 'A1', isEditing: false }],
      [{ value: 'A2', isEditing: false }]
    ]))
    
    act(() => {
      result.current.addColumn()
    })
    
    // 列数が増えていることを確認
    expect(result.current.data[0].length).toBe(2)
    
    // 新しい列が空であることを確認
    expect(result.current.data[0][1].value).toBe('')
    expect(result.current.data[1][1].value).toBe('')
  })

  it('addColumn: 列を追加した後も既存のデータが保持されること', () => {
    const { result } = renderHook(() => useTableData([
      [{ value: 'A1', isEditing: false }],
      [{ value: 'A2', isEditing: false }]
    ]))
    
    act(() => {
      result.current.addColumn()
    })
    
    // 既存のデータが保持されていることを確認
    expect(result.current.data[0][0].value).toBe('A1')
    expect(result.current.data[1][0].value).toBe('A2')
    
    // 列数が変わっていないことを確認
    expect(result.current.data[0].length).toBe(2)
  })

  it('removeRow: 行を削除できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.removeRow()
    })
    
    // 行数が減っていることを確認
    expect(result.current.data.length).toBe(1)
    // 残りの行が正しいことを確認
    expect(result.current.data[0][0].value).toBe('セル1')
    expect(result.current.data[0][1].value).toBe('セル2')
  })

  it('removeRow: 行が1つしかない場合は削除しないこと', () => {
    const singleRowData: TableData = [
      [
        { value: 'セル1', isEditing: false },
        { value: 'セル2', isEditing: false }
      ]
    ]
    
    const { result } = renderHook(() => useTableData(singleRowData))
    
    act(() => {
      result.current.removeRow()
    })
    
    // 行数が変わっていないことを確認
    expect(result.current.data.length).toBe(1)
  })

  it('removeColumn: 列を削除できること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    act(() => {
      result.current.removeColumn()
    })
    
    // 列数が減っていることを確認
    expect(result.current.data[0].length).toBe(1)
    expect(result.current.data[1].length).toBe(1)
    // 残りの列が正しいことを確認
    expect(result.current.data[0][0].value).toBe('セル1')
    expect(result.current.data[1][0].value).toBe('セル3')
  })

  it('removeColumn: 列が1つしかない場合は削除しないこと', () => {
    const singleColumnData: TableData = [
      [{ value: 'セル1', isEditing: false }],
      [{ value: 'セル3', isEditing: false }]
    ]
    
    const { result } = renderHook(() => useTableData(singleColumnData))
    
    act(() => {
      result.current.removeColumn()
    })
    
    // 列数が変わっていないことを確認
    expect(result.current.data[0].length).toBe(1)
  })

  it('copyData: 選択範囲のデータをコピーできること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    const copiedData = result.current.copyData(
      { row: 0, col: 0 },
      { row: 1, col: 1 }
    )
    
    // コピーされたデータが正しいことを確認
    expect(copiedData).toBe('セル1\tセル2\nセル3\tセル4\n')
  })

  it('copyData: 選択範囲が逆順でも正しくコピーできること', () => {
    const { result } = renderHook(() => useTableData(initialData))
    
    const copiedData = result.current.copyData(
      { row: 1, col: 1 },
      { row: 0, col: 0 }
    )
    
    // コピーされたデータが正しいことを確認
    expect(copiedData).toBe('セル1\tセル2\nセル3\tセル4\n')
  })
}) 