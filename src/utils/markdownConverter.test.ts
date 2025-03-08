import { describe, it, expect } from 'vitest'
import { convertToMarkdown } from './markdownConverter'
import { TableData } from '../types/table'

describe('markdownConverter', () => {
  it('空のデータの場合は空文字列を返すこと', () => {
    const emptyData: TableData = []
    expect(convertToMarkdown(emptyData)).toBe('')
  })

  it('テーブルが正しくMarkdown形式に変換されること', () => {
    const data: TableData = [
      [{ value: 'セル1', isEditing: false }, { value: 'セル2', isEditing: false }],
      [{ value: 'データ1', isEditing: false }, { value: 'データ2', isEditing: false }]
    ]
    
    expect(convertToMarkdown(data)).toBe('| セル1   | セル2   |\n|---------|---------|\n| データ1 | データ2 |');
  })

  it('改行が正しく変換されること', () => {
    const data: TableData = [
      [{ value: '行1\n行2', isEditing: false }, { value: 'セル2', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    expect(result).toContain('| 行1<br>行2 | セル2 |')
  })

  it('数値が正しく変換されること', () => {
    const data: TableData = [
      [{ value: '123', isEditing: false }, { value: '456', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    expect(result).toBe('| 123 | 456 |')
  })

  it('末尾の改行が削除されること', () => {
    const data: TableData = [
      [{ value: 'ヘッダー1', isEditing: false }, { value: 'ヘッダー2', isEditing: false }],
      [{ value: '値1\n', isEditing: false }, { value: '値2\n\n', isEditing: false }]
    ]
    
    expect(convertToMarkdown(data)).toBe('| ヘッダー1 | ヘッダー2 |\n|-----------|-----------|\n| 値1       | 値2       |');
  })

  it('異なる改行コード（CR、CRLF）が正しく処理されること', () => {
    const data: TableData = [
      [{ value: 'ヘッダー1', isEditing: false }, { value: 'ヘッダー2', isEditing: false }],
      [{ value: '値1\r改行後', isEditing: false }, { value: '値2\r\n改行後', isEditing: false }]
    ]
    
    expect(convertToMarkdown(data)).toBe('| ヘッダー1     | ヘッダー2     |\n|---------------|---------------|\n| 値1<br>改行後 | 値2<br>改行後 |');
  })

  it('文字サイズに応じてハイフンの数が変更されること', () => {
    const data: TableData = [
      [{ value: 'A', isEditing: false }, { value: '長いヘッダー', isEditing: false }, { value: '非常に長いヘッダーテキスト', isEditing: false }],
      [{ value: '1', isEditing: false }, { value: '2', isEditing: false }, { value: '3', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    expect(result).toContain('|---|--------------|----------------------------|');
  })

  it('マルチバイト文字の幅が正しく計算されること', () => {
    const data: TableData = [
      [{ value: 'ABC', isEditing: false }, { value: 'あいう', isEditing: false }, { value: 'ＡＢＣ', isEditing: false }],
      [{ value: '1', isEditing: false }, { value: '2', isEditing: false }, { value: '3', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    expect(result).toContain('|-----|--------|--------|');
  })

  it('改行を含むセルの幅が正しく計算されること', () => {
    const data: TableData = [
      [{ value: 'ヘッダー1', isEditing: false }, { value: '改行\nあり', isEditing: false }, { value: '改行\n\nが\n複数', isEditing: false }],
      [{ value: '1', isEditing: false }, { value: '2', isEditing: false }, { value: '3', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    expect(result).toContain('|-----------|--------------|------------------------|');
  })

  it('すべての行の最大文字数を使ってハイフンの数が決定されること', () => {
    const data: TableData = [
      [{ value: 'ヘッダー1', isEditing: false }, { value: 'ヘッダー2', isEditing: false }, { value: 'ヘッダー3', isEditing: false }],
      [{ value: '短いデータ', isEditing: false }, { value: 'とても長いデータが入っています', isEditing: false }, { value: '中程度', isEditing: false }],
      [{ value: '1', isEditing: false }, { value: '2', isEditing: false }, { value: '長い値が下の行にある場合', isEditing: false }]
    ]
    
    const result = convertToMarkdown(data)
    
    expect(result).toContain('|------------|--------------------------------|--------------------------|');
  })
}) 