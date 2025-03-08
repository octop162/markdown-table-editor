import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClipboard } from './useClipboard'
import { TableData, Position } from '../types/table'

describe('useClipboard', () => {
  let mockTableData: TableData
  const mockUpdateMultipleCells = vi.fn()
  const mockUpdateMultipleCellsWithDifferentValues = vi.fn()
  const mockAddMultipleRows = vi.fn()
  const mockAddMultipleColumns = vi.fn()
  
  // モックgetSelectedCellPositions関数
  const mockGetSelectedCellPositions = vi.fn().mockImplementation(() => {
    return [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 }
    ] as Position[];
  });
  
  beforeEach(() => {
    mockTableData = [
      [{ value: 'A1', isEditing: false }, { value: 'B1', isEditing: false }, { value: 'C1', isEditing: false }],
      [{ value: 'A2', isEditing: false }, { value: 'B2', isEditing: false }, { value: 'C2', isEditing: false }],
      [{ value: 'A3', isEditing: false }, { value: 'B3', isEditing: false }, { value: 'C3', isEditing: false }]
    ]
    
    vi.clearAllMocks()
    
    // モックNavigator Clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\tY1\nX2\tY2')
      },
      configurable: true
    })
  })
  
  it('copySelectedCells: 選択範囲のセルをコピーできること', async () => {
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    result.current.copySelectedCells()
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('A1\tB1\nA2\tB2\n')
  })
  
  it('formatCellValueForExcel: 異なる改行コード（CR、CRLF）が正しく処理されること', async () => {
    // テスト用のデータを作成（CRLFとCRを含む）
    const mockTableDataWithDifferentLineBreaks: TableData = [
      [{ value: 'A1\r\nB1', isEditing: false }, { value: 'C1\rD1', isEditing: false }]
    ]
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableDataWithDifferentLineBreaks,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 1 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    result.current.copySelectedCells()
    
    // 改行コードが正規化され、適切にフォーマットされていることを確認
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"A1\nB1"\t"C1\nD1"\n')
  })

  it('pasteToSelectedCells: 異なる改行コード（CR、CRLF）が正しく処理されること', async () => {
    // モックNavigator Clipboard APIを上書き（CRLFとCRを含む）
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\r\nY1\tZ1\rW1')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: null,
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // 実際の呼び出し順序と引数を確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'X1' },
        { position: { row: 1, col: 0 }, value: 'Y1' },
        { position: { row: 1, col: 1 }, value: 'Z1' },
        { position: { row: 2, col: 0 }, value: 'W1' }
      ])
    )
  })
  
  it('cutSelectedCells: 選択範囲のセルをカットできること', async () => {
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    result.current.cutSelectedCells()
    
    // コピーされたことを確認
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('A1\tB1\nA2\tB2\n')
    
    // セルがクリアされたことを確認
    expect(mockUpdateMultipleCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 }
      ]),
      ''
    )
  })
  
  it('pasteToSelectedCells: 選択されたセルにペーストできること', async () => {
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: null,
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // ペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'X1' },
        { position: { row: 0, col: 1 }, value: 'Y1' },
        { position: { row: 1, col: 0 }, value: 'X2' },
        { position: { row: 1, col: 1 }, value: 'Y2' }
      ])
    )
  })
  
  it('pasteToSelectedCells: 単一セルのコピーを複数選択したセルにペーストできること', async () => {
    // 単一セルのデータ
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 1 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // 選択した全てのセルに同じ値がペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'X1' },
        { position: { row: 0, col: 1 }, value: 'X1' },
        { position: { row: 1, col: 0 }, value: 'X1' },
        { position: { row: 1, col: 1 }, value: 'X1' }
      ])
    )
  })
  
  it('pasteToSelectedCells: 横一列のデータを縦に繰り返しペーストできること', async () => {
    // 横一列のデータ
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\tY1')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 2, col: 1 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // 横一列のデータが縦に繰り返しペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'X1' },
        { position: { row: 0, col: 1 }, value: 'Y1' },
        { position: { row: 1, col: 0 }, value: 'X1' },
        { position: { row: 1, col: 1 }, value: 'Y1' },
        { position: { row: 2, col: 0 }, value: 'X1' },
        { position: { row: 2, col: 1 }, value: 'Y1' }
      ])
    )
  })
  
  it('pasteToSelectedCells: 縦一列のデータを横に繰り返しペーストできること', async () => {
    // 縦一列のデータ
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\nX2')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 1, col: 2 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // 縦一列のデータが横に繰り返しペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'X1' },
        { position: { row: 0, col: 1 }, value: 'X1' },
        { position: { row: 0, col: 2 }, value: 'X1' },
        { position: { row: 1, col: 0 }, value: 'X2' },
        { position: { row: 1, col: 1 }, value: 'X2' },
        { position: { row: 1, col: 2 }, value: 'X2' }
      ])
    )
  })

  it('pasteToSelectedCells: セル内改行を含むデータを正しくペーストできること', async () => {
    // セル内改行を含むデータ（より単純なケース）
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('"Line1\nLine2"')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: null,
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // セル内改行を含むデータが正しくペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'Line1\nLine2' }
      ])
    )
  })

  it('pasteToSelectedCells: 複数のセルと改行を含むデータを正しくペーストできること', async () => {
    // テスト前にモックをクリア
    vi.clearAllMocks()
    
    // 複数のセルと改行を含むデータ
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('"Line1\nLine2"\tB1\n"C1\nC2\nC3"\tD1')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData,
      selectedCells: null,
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // 複数のセルと改行を含むデータが正しくペーストされたことを確認
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 0 }, value: 'Line1\nLine2' },
        { position: { row: 0, col: 1 }, value: 'B1' },
        { position: { row: 1, col: 0 }, value: 'C1\nC2\nC3' },
        { position: { row: 1, col: 1 }, value: 'D1' }
      ])
    )
  })

  it('copySelectedCells: 改行を含むセルの値を正しくコピーできること', async () => {
    // 改行を含むテストデータを作成
    const mockTableDataWithLineBreaks: TableData = [
      [{ value: 'Line 1\nLine 2', isEditing: false }, { value: 'B1', isEditing: false }],
      [{ value: 'A2', isEditing: false }, { value: 'B2', isEditing: false }]
    ]
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableDataWithLineBreaks,
      selectedCells: {
        start: { row: 0, col: 0 },
        end: { row: 0, col: 0 }
      },
      currentCell: { row: 0, col: 0 },
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    result.current.copySelectedCells()
    
    // 改行を含むセルが正しくフォーマットされてコピーされたことを確認
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('"Line 1\nLine 2"\n')
  })

  it('pasteToSelectedCells: テーブルの範囲外にペーストする場合、必要な行数を追加すること', async () => {
    // 大きなデータをペーストするケース
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\tY1\nX2\tY2\nX3\tY3\nX4\tY4')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData, // 3x3のテーブル
      selectedCells: null,
      currentCell: { row: 1, col: 1 }, // 中央のセルから開始
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // ペーストされたデータが正しく配置されたことを確認（範囲外の行を含む）
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 1, col: 1 }, value: 'X1' },
        { position: { row: 1, col: 2 }, value: 'Y1' },
        { position: { row: 2, col: 1 }, value: 'X2' },
        { position: { row: 2, col: 2 }, value: 'Y2' },
        { position: { row: 3, col: 1 }, value: 'X3' }, // テーブルの範囲外（行）
        { position: { row: 3, col: 2 }, value: 'Y3' }, // テーブルの範囲外（行）
        { position: { row: 4, col: 1 }, value: 'X4' }, // テーブルの範囲外（行）
        { position: { row: 4, col: 2 }, value: 'Y4' }  // テーブルの範囲外（行）
      ])
    )
  })

  it('pasteToSelectedCells: テーブルの範囲外にペーストする場合、必要な列数を追加すること', async () => {
    // 横に大きなデータをペーストするケース
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('X1\tY1\tZ1\tW1')
      },
      configurable: true
    })
    
    const { result } = renderHook(() => useClipboard({
      tableData: mockTableData, // 3x3のテーブル
      selectedCells: null,
      currentCell: { row: 0, col: 1 }, // 上部中央のセルから開始
      updateMultipleCells: mockUpdateMultipleCells,
      updateMultipleCellsWithDifferentValues: mockUpdateMultipleCellsWithDifferentValues,
      getSelectedCellPositions: mockGetSelectedCellPositions,
      addMultipleRows: mockAddMultipleRows,
      addMultipleColumns: mockAddMultipleColumns
    }))
    
    await result.current.pasteToSelectedCells()
    
    // ペーストされたデータが正しく配置されたことを確認（範囲外の列を含む）
    expect(mockUpdateMultipleCellsWithDifferentValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        { position: { row: 0, col: 1 }, value: 'X1' },
        { position: { row: 0, col: 2 }, value: 'Y1' },
        { position: { row: 0, col: 3 }, value: 'Z1' }, // テーブルの範囲外（列）
        { position: { row: 0, col: 4 }, value: 'W1' }  // テーブルの範囲外（列）
      ])
    )
  })
}) 