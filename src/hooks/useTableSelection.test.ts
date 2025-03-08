import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTableSelection } from './useTableSelection'
import { TableData } from '../types/table'

describe('useTableSelection', () => {
  // テスト用のモックデータ
  let mockData: TableData
  
  beforeEach(() => {
    // テスト用の初期データをリセット
    mockData = [
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
  
  it('初期状態が正しく設定されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    expect(result.current.currentCell).toBeNull()
    expect(result.current.selection).toBeNull()
    expect(result.current.isShiftPressed).toBe(false)
  })
  
  it('selectCell: セルを選択すると選択状態が更新されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    act(() => {
      result.current.selectCell(1, 2)
    })
    
    expect(result.current.currentCell).toEqual({ row: 1, col: 2 })
    expect(result.current.selection).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 1, col: 2 }
    })
  })
  
  it('setShiftKey: Shiftキーの状態を設定できること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    act(() => {
      result.current.setShiftKey(true)
    })
    
    expect(result.current.isShiftPressed).toBe(true)
    
    act(() => {
      result.current.setShiftKey(false)
    })
    
    expect(result.current.isShiftPressed).toBe(false)
  })
  
  it('selectCell: Shiftキーが押されている状態で別のセルを選択すると選択範囲が設定されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 最初のセルを選択
    act(() => {
      result.current.selectCell(1, 2)
    })
    
    // Shiftキーを押す
    act(() => {
      result.current.setShiftKey(true)
    })
    
    // 別のセルを選択
    act(() => {
      result.current.selectCell(3, 4)
    })
    
    expect(result.current.selection).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 3, col: 4 }
    })
  })
  
  it('handleMouseDown: ドラッグ開始時に選択状態が更新されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    act(() => {
      result.current.handleMouseDown(1, 2)
    })
    
    expect(result.current.currentCell).toEqual({ row: 1, col: 2 })
    expect(result.current.selection).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 1, col: 2 }
    })
    expect(result.current.isDragging).toBe(true)
  })
  
  it('handleMouseMove: ドラッグ中に選択範囲が更新されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // ドラッグ開始
    act(() => {
      result.current.handleMouseDown(1, 2)
    })
    
    // ドラッグ中
    act(() => {
      result.current.handleMouseMove(3, 4)
    })
    
    expect(result.current.selection).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 3, col: 4 }
    })
  })
  
  it('handleMouseUp: ドラッグ終了時にドラッグ状態がリセットされること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // ドラッグ操作
    act(() => {
      result.current.handleMouseDown(1, 2)
    })
    
    act(() => {
      result.current.handleMouseMove(3, 4)
    })
    
    act(() => {
      result.current.handleMouseUp()
    })
    
    // 選択範囲は維持されるが、ドラッグ状態はリセットされる
    expect(result.current.selection).toEqual({
      start: { row: 1, col: 2 },
      end: { row: 3, col: 4 }
    })
    expect(result.current.isDragging).toBe(false)
  })
  
  it('getSelectedCellPositions: 選択範囲内のすべてのセル位置を取得できること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 選択範囲を設定（ドラッグ操作で設定）
    act(() => {
      result.current.handleMouseDown(1, 1)
    })
    
    act(() => {
      result.current.handleMouseMove(2, 2)
    })
    
    const selectedCells = result.current.getSelectedCellPositions()
    
    // 選択範囲内のすべてのセル位置が含まれていることを確認
    expect(selectedCells).toContainEqual({ row: 1, col: 1 })
    expect(selectedCells).toContainEqual({ row: 1, col: 2 })
    expect(selectedCells).toContainEqual({ row: 2, col: 1 })
    expect(selectedCells).toContainEqual({ row: 2, col: 2 })
    expect(selectedCells.length).toBe(4)
  })
  
  it('isCellSelected: 選択範囲内のセルが正しく判定されること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 選択範囲を設定（ドラッグ操作で設定）
    act(() => {
      result.current.handleMouseDown(1, 1)
    })
    
    act(() => {
      result.current.handleMouseMove(2, 2)
    })
    
    // 選択範囲内のセル
    expect(result.current.isCellSelected(1, 1)).toBe(true)
    expect(result.current.isCellSelected(1, 2)).toBe(true)
    expect(result.current.isCellSelected(2, 1)).toBe(true)
    expect(result.current.isCellSelected(2, 2)).toBe(true)
    
    // 選択範囲外のセル
    expect(result.current.isCellSelected(0, 0)).toBe(false)
    expect(result.current.isCellSelected(3, 3)).toBe(false)
  })
  
  it('clearSelection: 選択状態をクリアできること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 選択状態を設定
    act(() => {
      result.current.selectCell(1, 2)
    })
    
    act(() => {
      result.current.setShiftKey(true)
    })
    
    act(() => {
      result.current.selectCell(3, 4)
    })
    
    // 選択状態をクリア
    act(() => {
      result.current.clearSelection()
    })
    
    expect(result.current.currentCell).toBeNull()
    expect(result.current.selection).toBeNull()
  })
  
  it('moveSelection: 選択範囲を移動できること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 初期選択
    act(() => {
      result.current.selectCell(0, 0)
    })
    
    // 右に移動
    act(() => {
      result.current.moveSelection('right')
    })
    
    expect(result.current.currentCell).toEqual({ row: 0, col: 1 })
    
    // 下に移動
    act(() => {
      result.current.moveSelection('down')
    })
    
    expect(result.current.currentCell).toEqual({ row: 1, col: 1 })
  })
  
  it('moveSelection: Shiftキーを押しながら移動すると選択範囲が拡大すること', () => {
    const { result } = renderHook(() => useTableSelection(mockData))
    
    // 初期選択
    act(() => {
      result.current.selectCell(0, 0)
    })
    
    // Shiftキーを押す
    act(() => {
      result.current.setShiftKey(true)
    })
    
    // 右に移動
    act(() => {
      result.current.moveSelection('right')
    })
    
    // 下に移動
    act(() => {
      result.current.moveSelection('down')
    })
    
    expect(result.current.selection).toEqual({
      start: { row: 0, col: 0 },
      end: { row: 1, col: 1 }
    })
  })
}) 