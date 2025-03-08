import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Table } from './Table'
import { TableData } from '../types/table'

describe('Table', () => {
  // モックデータ
  const mockData: TableData = [
    [
      { value: 'セル1', isEditing: false },
      { value: 'セル2', isEditing: false }
    ],
    [
      { value: 'セル3', isEditing: false },
      { value: 'セル4', isEditing: false }
    ]
  ]

  it('正しいデータが表示されること', () => {
    render(<Table initialData={mockData} />)
    
    expect(screen.getByText('セル1')).toBeInTheDocument()
    expect(screen.getByText('セル2')).toBeInTheDocument()
    expect(screen.getByText('セル3')).toBeInTheDocument()
    expect(screen.getByText('セル4')).toBeInTheDocument()
  })
  
  it('行を追加できること', () => {
    render(<Table initialData={mockData} />)
    
    // 行追加ボタンを探して押す
    const addRowButton = screen.getByRole('button', { name: /行を追加/i })
    fireEvent.click(addRowButton)
    
    // 新しい行が追加されていることを確認（空のセルが2つ追加される）
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBe(6) // 2x2 + 新しい行の2セル
  })
  
  it('列を追加できること', () => {
    render(<Table initialData={mockData} />)
    
    // 列追加ボタンを探して押す
    const addColumnButton = screen.getByRole('button', { name: /列を追加/i })
    fireEvent.click(addColumnButton)
    
    // 新しい列が追加されていることを確認（空のセルが2つ追加される）
    const cells = screen.getAllByRole('cell')
    expect(cells.length).toBe(6) // 2x2 + 新しい列の2セル
  })
}) 