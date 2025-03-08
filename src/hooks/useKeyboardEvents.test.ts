import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardEvents } from './useKeyboardEvents'
import { TableData } from '../types/table'

describe('useKeyboardEvents', () => {
  // モックハンドラー
  const mockHandlers = {
    moveSelection: vi.fn(),
    setShiftKey: vi.fn(),
    copySelectedCells: vi.fn(),
    pasteToSelectedCells: vi.fn(),
    startEditing: vi.fn(),
    stopEditing: vi.fn(),
    clearSelectedCells: vi.fn(),
    isEditing: false
  }
  
  // テスト用のモックデータ
  let mockData: TableData
  
  // キーボードイベントをシミュレートする関数
  const simulateKeyDown = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    })
    document.dispatchEvent(event)
    return event
  }
  
  const simulateKeyUp = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keyup', {
      key,
      bubbles: true,
      cancelable: true,
      ...options
    })
    document.dispatchEvent(event)
    return event
  }
  
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
    
    // isEditingをリセット
    mockHandlers.isEditing = false
  })
  
  it('矢印キーで選択を移動できること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    // 上矢印キー
    const upEvent = simulateKeyDown('ArrowUp')
    expect(upEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('up')
    
    // 下矢印キー
    const downEvent = simulateKeyDown('ArrowDown')
    expect(downEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('down')
    
    // 左矢印キー
    const leftEvent = simulateKeyDown('ArrowLeft')
    expect(leftEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('left')
    
    // 右矢印キー
    const rightEvent = simulateKeyDown('ArrowRight')
    expect(rightEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('right')
  })
  
  it('Deleteキーでセルをクリアできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const deleteEvent = simulateKeyDown('Delete')
    expect(deleteEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.clearSelectedCells).toHaveBeenCalled()
  })
  
  it('Backspaceキーでセルをクリアできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const backspaceEvent = simulateKeyDown('Backspace')
    expect(backspaceEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.clearSelectedCells).toHaveBeenCalled()
  })
  
  it('Tabキーで右のセルに移動できること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const tabEvent = simulateKeyDown('Tab')
    expect(tabEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('right')
  })
  
  it('Shift+Tabキーで左のセルに移動できること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const shiftTabEvent = simulateKeyDown('Tab', { shiftKey: true })
    expect(shiftTabEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.moveSelection).toHaveBeenCalledWith('left')
  })
  
  it('Ctrl+Cでコピーできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const ctrlCEvent = simulateKeyDown('c', { ctrlKey: true })
    expect(ctrlCEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.copySelectedCells).toHaveBeenCalled()
  })
  
  it('Cmd+Cでコピーできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const cmdCEvent = simulateKeyDown('c', { metaKey: true })
    expect(cmdCEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.copySelectedCells).toHaveBeenCalled()
  })
  
  it('Ctrl+Vでペーストできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const ctrlVEvent = simulateKeyDown('v', { ctrlKey: true })
    expect(ctrlVEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.pasteToSelectedCells).toHaveBeenCalled()
  })
  
  it('Cmd+Vでペーストできること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    const cmdVEvent = simulateKeyDown('v', { metaKey: true })
    expect(cmdVEvent.defaultPrevented).toBe(true)
    expect(mockHandlers.pasteToSelectedCells).toHaveBeenCalled()
  })
  
  it('Shiftキーを押すとsetShiftKeyが呼ばれること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    simulateKeyDown('Shift')
    expect(mockHandlers.setShiftKey).toHaveBeenCalledWith(true)
  })
  
  it('Shiftキーを離すとsetShiftKeyが呼ばれること', () => {
    renderHook(() => useKeyboardEvents(mockData, mockHandlers))
    
    simulateKeyUp('Shift')
    expect(mockHandlers.setShiftKey).toHaveBeenCalledWith(false)
  })
  
  describe('編集モード中', () => {
    beforeEach(() => {
      mockHandlers.isEditing = true
    })
    
    it('Escapeキーで編集をキャンセルできること', () => {
      renderHook(() => useKeyboardEvents(mockData, mockHandlers))
      
      const escEvent = simulateKeyDown('Escape')
      expect(escEvent.defaultPrevented).toBe(true)
      expect(mockHandlers.stopEditing).toHaveBeenCalledWith(false)
    })
    
    it('Enterキーで編集を確定して下のセルに移動できること', () => {
      renderHook(() => useKeyboardEvents(mockData, mockHandlers))
      
      const enterEvent = simulateKeyDown('Enter')
      expect(enterEvent.defaultPrevented).toBe(true)
      expect(mockHandlers.stopEditing).toHaveBeenCalledWith(true)
      expect(mockHandlers.moveSelection).toHaveBeenCalledWith('down')
    })
    
    it('Shift+Enterキーでは下のセルに移動しないこと', () => {
      renderHook(() => useKeyboardEvents(mockData, mockHandlers))
      
      const shiftEnterEvent = simulateKeyDown('Enter', { shiftKey: true })
      expect(shiftEnterEvent.defaultPrevented).toBe(false)
      expect(mockHandlers.stopEditing).not.toHaveBeenCalled()
      expect(mockHandlers.moveSelection).not.toHaveBeenCalled()
    })
    
    it('Tabキーで編集を確定して右のセルに移動できること', () => {
      renderHook(() => useKeyboardEvents(mockData, mockHandlers))
      
      const tabEvent = simulateKeyDown('Tab')
      expect(tabEvent.defaultPrevented).toBe(true)
      expect(mockHandlers.stopEditing).toHaveBeenCalledWith(true)
      expect(mockHandlers.moveSelection).toHaveBeenCalledWith('right')
    })
    
    it('Shift+Tabキーで編集を確定して左のセルに移動できること', () => {
      renderHook(() => useKeyboardEvents(mockData, mockHandlers))
      
      const shiftTabEvent = simulateKeyDown('Tab', { shiftKey: true })
      expect(shiftTabEvent.defaultPrevented).toBe(true)
      expect(mockHandlers.stopEditing).toHaveBeenCalledWith(true)
      expect(mockHandlers.moveSelection).toHaveBeenCalledWith('left')
    })
  })
}) 