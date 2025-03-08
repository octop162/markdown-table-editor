import { render, screen, fireEvent } from '@testing-library/react'
import { Cell } from './Cell'
import { describe, it, expect, vi } from 'vitest'

describe('Cell', () => {
  it('renders the value', () => {
    render(<Cell value="テスト" isEditing={false} isSelected={false} onEdit={() => {}} onSelect={() => {}} />)
    expect(screen.getByText('テスト')).toBeInTheDocument()
  })

  it('renders an input when editing', () => {
    render(<Cell value="テスト" isEditing={true} isSelected={false} onEdit={() => {}} onSelect={() => {}} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('テスト')
  })

  it('calls onSelect when clicked', () => {
    const onSelectMock = vi.fn()
    render(<Cell value="テスト" isEditing={false} isSelected={false} onEdit={() => {}} onSelect={onSelectMock} />)
    fireEvent.click(screen.getByText('テスト'))
    expect(onSelectMock).toHaveBeenCalled()
  })

  it('text input works correctly', () => {
    const onEditMock = vi.fn()
    render(<Cell value="テスト" isEditing={true} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新しい値' } })
    expect(onEditMock).toHaveBeenCalledWith('新しい値')
  })

  // 新しいテスト: 編集中に値が消えないことを確認
  it('preserves input value during editing', () => {
    const onEditMock = vi.fn()
    const { rerender } = render(
      <Cell value="初期値" isEditing={true} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    // 入力を変更
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '編集中の値' } })
    
    // 親コンポーネントが再レンダリングしても値が保持されることを確認
    rerender(
      <Cell value="初期値" isEditing={true} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    expect(input).toHaveValue('編集中の値')
  })

  // 新しいテスト: 編集終了時に値が正しく保存されることを確認
  it('saves value correctly when editing ends', () => {
    const onEditMock = vi.fn()
    const { rerender } = render(
      <Cell value="初期値" isEditing={true} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    // 入力を変更
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '編集後の値' } })
    
    // 編集モードを終了
    rerender(
      <Cell value="編集後の値" isEditing={false} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    // 表示されるテキストが更新されていることを確認
    expect(screen.getByText('編集後の値')).toBeInTheDocument()
  })

  // 新しいテスト: 親コンポーネントから値が更新された場合のテスト
  it('updates when value prop changes', () => {
    const onEditMock = vi.fn()
    const { rerender } = render(
      <Cell value="初期値" isEditing={false} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    // 親から値を更新
    rerender(
      <Cell value="更新された値" isEditing={false} isSelected={false} onEdit={onEditMock} onSelect={() => {}} />
    )
    
    // 表示されるテキストが更新されていることを確認
    expect(screen.getByText('更新された値')).toBeInTheDocument()
  })
}) 