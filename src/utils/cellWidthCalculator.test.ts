import { describe, it, expect } from 'vitest'
import { calculateTextWidth, calculateCellWidth, calculateColumnWidths, calculateMarkdownTextWidth } from './cellWidthCalculator'
import { TableData } from '../types/table'

describe('cellWidthCalculator', () => {
  describe('calculateTextWidth', () => {
    it('空文字列の場合は0を返すこと', () => {
      expect(calculateTextWidth('')).toBe(0)
      expect(calculateTextWidth('')).toBe(0)
      expect(calculateTextWidth('')).toBe(0)
    })

    it('半角文字の幅を正しく計算すること', () => {
      expect(calculateTextWidth('abc')).toBe(3)
      expect(calculateTextWidth('123')).toBe(3)
      expect(calculateTextWidth('a1b2c3')).toBe(6)
    })

    it('全角文字の幅を正しく計算すること', () => {
      expect(calculateTextWidth('あ')).toBe(2)
      expect(calculateTextWidth('あいう')).toBe(6)
      expect(calculateTextWidth('漢字')).toBe(4)
    })

    it('半角と全角が混在する場合の幅を正しく計算すること', () => {
      expect(calculateTextWidth('abc漢字')).toBe(7) // 3 + 4
      expect(calculateTextWidth('123あいう')).toBe(9) // 3 + 6
      expect(calculateTextWidth('a1あb2いc3う')).toBe(12) // 6 + 6
    })
  })

  describe('calculateCellWidth', () => {
    it('空文字列の場合はデフォルト幅を返すこと', () => {
      expect(calculateCellWidth('')).toBe(80)
      expect(calculateCellWidth('')).toBe(80)
      expect(calculateCellWidth('')).toBe(80)
    })

    it('文字列の幅に基づいて計算すること', () => {
      // 半角10文字 * 8px + 16px(パディング) = 96px
      expect(calculateCellWidth('1234567890')).toBe(96)
      
      // 全角5文字 * 2 * 8px + 16px = 96px
      expect(calculateCellWidth('あいうえお')).toBe(96)
    })

    it('最小幅より小さい場合は最小幅を返すこと', () => {
      // 半角3文字 * 8px + 16px = 40px < 最小幅80px
      expect(calculateCellWidth('abc')).toBe(80)
      
      // 最小幅を指定した場合
      expect(calculateCellWidth('abc', 50)).toBe(50)
    })

    it('改行を含む場合は最も長い行の幅を基準にすること', () => {
      // 最長行: 全角5文字 * 2 * 8px + 16px = 96px
      expect(calculateCellWidth('あいう\nあいうえお\nあい')).toBe(96)
      
      // 最長行: 半角10文字 * 8px + 16px = 96px
      expect(calculateCellWidth('abc\n1234567890\ndefg')).toBe(96)
    })

    it('文字幅の単位を変更できること', () => {
      // 半角10文字 * 10px + 16px = 116px
      expect(calculateCellWidth('1234567890', 80, 10)).toBe(116)
    })
  })

  describe('calculateColumnWidths', () => {
    it('空のデータの場合は空配列を返すこと', () => {
      expect(calculateColumnWidths([])).toEqual([])
      // 空の行を持つデータの場合
      const emptyRowData: TableData = [[]]
      expect(calculateColumnWidths(emptyRowData)).toEqual([])
    })

    it('各列の最適な幅を計算すること', () => {
      const data: TableData = [
        [
          { value: 'あいうえお', isEditing: false },
          { value: 'abc', isEditing: false },
          { value: '1234567890', isEditing: false }
        ],
        [
          { value: 'あい', isEditing: false },
          { value: 'abcdef', isEditing: false },
          { value: '123', isEditing: false }
        ]
      ]
      
      const result = calculateColumnWidths(data)
      
      // 列1: 全角5文字 * 2 * 8px + 16px = 96px
      // 列2: 半角6文字 * 8px + 16px = 64px < 最小幅80px
      // 列3: 半角10文字 * 8px + 16px = 96px
      expect(result).toEqual([96, 80, 96])
    })

    it('既存の幅は考慮せず、内容に基づいて計算すること', () => {
      const data: TableData = [
        [
          { value: 'あいうえお', isEditing: false, width: 50 },
          { value: 'abc', isEditing: false, width: 200 }
        ]
      ]
      
      const result = calculateColumnWidths(data)
      
      // 列1: 全角5文字 * 2 * 8px + 16px = 96px (既存の幅50pxは無視)
      // 列2: 半角3文字 * 8px + 16px = 40px < 最小幅80px (既存の幅200pxは無視)
      expect(result).toEqual([96, 80])
    })
  })

  describe('calculateMarkdownTextWidth', () => {
    it('空文字列の場合は0を返すこと', () => {
      expect(calculateMarkdownTextWidth('')).toBe(0)
      expect(calculateMarkdownTextWidth(null as unknown as string)).toBe(0)
      expect(calculateMarkdownTextWidth(undefined as unknown as string)).toBe(0)
    })

    it('半角文字の幅が正しく計算されること', () => {
      expect(calculateMarkdownTextWidth('abc')).toBe(3)
      expect(calculateMarkdownTextWidth('123')).toBe(3)
      expect(calculateMarkdownTextWidth('a1b2c3')).toBe(6)
    })

    it('全角文字の幅が正しく計算されること', () => {
      expect(calculateMarkdownTextWidth('あいう')).toBe(6) // 全角は2倍
      expect(calculateMarkdownTextWidth('ＡＢＣ')).toBe(6) // 全角英数も2倍
      expect(calculateMarkdownTextWidth('あ1い2う')).toBe(8) // 全角と半角の混在
    })

    it('改行を含む文字列の幅が正しく計算されること（改行は<br>として4文字扱い）', () => {
      expect(calculateMarkdownTextWidth('abc\ndef')).toBe(10) // 3 + 4 + 3 = 10
      expect(calculateMarkdownTextWidth('あいう\nえお')).toBe(14) // 6 + 4 + 4 = 14
      expect(calculateMarkdownTextWidth('a\nb\nc')).toBe(11) // 1 + 4 + 1 + 4 + 1 = 11
    })

    it('複数の改行を含む文字列の幅が正しく計算されること', () => {
      expect(calculateMarkdownTextWidth('abc\n\ndef')).toBe(14) // 3 + 4 + 0 + 4 + 3 = 14
      expect(calculateMarkdownTextWidth('\n\n\n')).toBe(12) // 0 + 4 + 0 + 4 + 0 + 4 = 12
    })

    it('改行による折り返しを無視して計算されること', () => {
      // 通常の計算では最大幅を使用するが、Markdown用は全行の合計
      const normalText = 'short\nvery long line\nmedium';
      
      // 通常の計算では 'very long line' の幅が使用される
      const normalWidth = Math.max(
        calculateTextWidth('short'),
        calculateTextWidth('very long line'),
        calculateTextWidth('medium')
      );
      
      // Markdown用は全行の合計（改行を<br>として）
      const markdownWidth = calculateMarkdownTextWidth(normalText);
      
      // Markdown用の幅は全行の合計なので、通常の計算より大きくなる
      expect(markdownWidth).toBeGreaterThan(normalWidth);
      expect(markdownWidth).toBe(
        calculateTextWidth('short') + 4 + 
        calculateTextWidth('very long line') + 4 + 
        calculateTextWidth('medium')
      );
    })
  })
}) 