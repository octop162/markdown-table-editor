import { TableData, CellValue } from '../types/table'
import { calculateMarkdownTextWidth, calculateMarkdownCellWidth } from './cellWidthCalculator'

// 文字揃えの型定義
type TextAlign = 'left' | 'center' | 'right'

/**
 * テーブルデータをMarkdown形式に変換
 * @param data テーブルデータ
 * @param columnAligns 列の文字揃え設定
 * @returns Markdown形式の文字列
 */
export const convertToMarkdown = (data: TableData, columnAligns?: TextAlign[]): string => {
  if (!data.length || !data[0].length) return ''

  // 各列の最大幅を計算（すべての行を考慮）
  const columnMaxWidths = Array(data[0].length).fill(0);
  
  // 各列が空かどうかをチェック
  const isColumnEmpty = Array(data[0].length).fill(true);
  
  // すべての行をループして各列の最大幅を計算
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = normalizeValue(row[colIndex].value);
      // 空でない値があれば、その列は空ではない
      if (cellValue.trim() !== '') {
        isColumnEmpty[colIndex] = false;
      }
      // |と文字の間の半角スペースも考慮した幅を計算
      const cellWidth = calculateMarkdownCellWidth(cellValue);
      if (cellWidth > columnMaxWidths[colIndex]) {
        columnMaxWidths[colIndex] = cellWidth;
      }
    }
  }

  // 一番上の行をヘッダーとして使用
  const headerValues = data[0].map(cell => normalizeValue(cell.value))
  const headerRow = headerValues.map((value, index) => {
    // 各セルの内容を最大幅に合わせてスペースで埋める
    const align = columnAligns ? columnAligns[index] : 'left';
    const isEmpty = isColumnEmpty[index];
    return padCellContent(formatCellValue(value), columnMaxWidths[index], align, isEmpty);
  })
  
  // ヘッダー行
  let markdown = '| ' + headerRow.join(' | ') + ' |\n'
  
  // 区切り行（各列の最大文字幅に応じてハイフンの数を調整）
  // |と文字の間の半角スペースも考慮（各セルの両側に1文字ずつ）
  markdown += '|' + columnMaxWidths.map((width, index) => {
    // 文字列の表示幅に基づいてハイフンの数を決定
    // 空文字の場合は|の間のスペース分3文字
    // 文字がある場合はスペース2文字を足してハイフンの数を決定
    let hyphenCount;
    
    if (width === 0) {
      // 空文字の場合は|の間のスペース分3文字
      hyphenCount = 3;
    } else {
      // 文字がある場合はスペース2文字を足す
      hyphenCount = width + 2;
    }
    
    // 文字揃えに応じて区切り行を調整
    const align = columnAligns ? columnAligns[index] : 'left';
    if (align === 'center') {
      return ':' + '-'.repeat(hyphenCount - 2) + ':';
    } else if (align === 'right') {
      return '-'.repeat(hyphenCount - 1) + ':';
    } else {
      // デフォルトは左揃え
      return ':' + '-'.repeat(hyphenCount - 1);
    }
  }).join('|') + '|\n'
  
  // 1行だけの場合は区切り行までで終了
  if (data.length === 1) {
    return markdown;
  }
  
  // データ行（ヘッダー行を除く）
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    markdown += '| ' + row.map((cell, index) => {
      // セル内の改行を<br>タグに変換し、数値を文字列に変換
      const normalizedValue = normalizeValue(cell.value);
      const formattedValue = formatCellValue(normalizedValue);
      
      // 各セルの内容を最大幅に合わせてスペースで埋める
      // 改行を含むセルの場合は、最後の行にのみパディングを適用
      const align = columnAligns ? columnAligns[index] : 'left';
      const isEmpty = isColumnEmpty[index];
      return padCellContentWithBr(formattedValue, columnMaxWidths[index], normalizedValue, align, isEmpty);
    }).join(' | ') + ' |'
    
    // 最後の行でなければ改行を追加
    if (i < data.length - 1) {
      markdown += '\n'
    }
  }
  
  return markdown
}

/**
 * セルの内容を指定された幅に合わせてスペースで埋める
 * @param content セルの内容
 * @param maxWidth 最大幅
 * @param align 文字揃えの設定
 * @param isColumnEmpty 列がすべて空かどうか
 * @returns スペースで埋められたセルの内容
 */
const padCellContent = (
  content: string, 
  maxWidth: number, 
  align: TextAlign = 'left', 
  isColumnEmpty: boolean = false
): string => {
  // 内容が空で列もすべて空の場合は、3つのスペースを返す
  if (content === '' && isColumnEmpty) {
    return ' ';
  }
  
  const contentWidth = calculateMarkdownTextWidth(content.replace(/<br>/g, '\n'));
  const paddingSpacesCount = maxWidth - contentWidth;
  
  if (paddingSpacesCount <= 0) return content;
  
  const paddingSpaces = ' '.repeat(paddingSpacesCount);
  
  // 文字揃えに応じてパディングを適用
  if (align === 'right') {
    return paddingSpaces + content;
  } else if (align === 'center') {
    const leftPadding = ' '.repeat(Math.floor(paddingSpacesCount / 2));
    const rightPadding = ' '.repeat(Math.ceil(paddingSpacesCount / 2));
    return leftPadding + content + rightPadding;
  } else {
    // デフォルトは左揃え
    return content + paddingSpaces;
  }
}

/**
 * 改行を含むセルの内容を指定された幅に合わせてスペースで埋める
 * 改行を含む場合は最後の行にのみパディングを適用
 * @param formattedContent <br>タグを含むフォーマット済みの内容
 * @param maxWidth 最大幅
 * @param originalContent 元の内容（改行を含む）
 * @param align 文字揃えの設定
 * @param isColumnEmpty 列がすべて空かどうか
 * @returns スペースで埋められたセルの内容
 */
const padCellContentWithBr = (
  formattedContent: string, 
  maxWidth: number, 
  originalContent: string,
  align: TextAlign = 'left',
  isColumnEmpty: boolean = false
): string => {
  // 内容が空で列もすべて空の場合は、1つのスペースを返す
  if (originalContent === '' && isColumnEmpty) {
    return ' ';
  }
  
  // <br>タグを含まない場合は通常のパディングを適用
  if (!formattedContent.includes('<br>')) {
    return padCellContent(formattedContent, maxWidth, align, isColumnEmpty);
  }
  
  // 元の内容を改行で分割
  const lines = originalContent.split('\n');
  const lastLineIndex = lines.length - 1;
  
  // 最後の行の幅を計算
  const lastLineWidth = calculateMarkdownTextWidth(lines[lastLineIndex]);
  
  // 最後の行以外の幅の合計を計算（<br>タグの幅を含む）
  let otherLinesWidth = 0;
  for (let i = 0; i < lastLineIndex; i++) {
    otherLinesWidth += calculateMarkdownTextWidth(lines[i]) + 4; // 4は<br>の幅
  }
  
  // 必要なパディングを計算
  const totalContentWidth = otherLinesWidth + lastLineWidth;
  const paddingSpacesCount = Math.max(0, maxWidth - totalContentWidth);
  
  // 最後の<br>の後にパディングを挿入
  const parts = formattedContent.split('<br>');
  const lastPartIndex = parts.length - 1;
  
  // 文字揃えに応じてパディングを適用
  const paddingSpaces = ' '.repeat(paddingSpacesCount);
  let lastPart = parts[lastPartIndex];
  
  if (align === 'right') {
    lastPart = paddingSpaces + lastPart;
  } else if (align === 'center') {
    const leftPadding = ' '.repeat(Math.floor(paddingSpacesCount / 2));
    const rightPadding = ' '.repeat(Math.ceil(paddingSpacesCount / 2));
    lastPart = leftPadding + lastPart + rightPadding;
  } else {
    // デフォルトは左揃え
    lastPart = lastPart + paddingSpaces;
  }
  
  return parts.slice(0, lastPartIndex).join('<br>') + 
         (lastPartIndex > 0 ? '<br>' : '') + 
         lastPart;
}

/**
 * 値を正規化する（改行コードの正規化）
 * @param value セルの値
 * @returns 正規化された値
 */
const normalizeValue = (value: CellValue): string => {
  if (typeof value === 'number') return String(value)
  if (!value) return ''
  
  // 改行コードを正規化（CRLF -> LF）
  let normalizedValue = String(value).replace(/\r\n/g, '\n');
  // CR -> LF
  normalizedValue = normalizedValue.replace(/\r/g, '\n');
  
  return normalizedValue;
}

/**
 * セルの値を整形する（改行を<br>に変換）
 * @param value セルの値
 * @returns 整形された値
 */
const formatCellValue = (value: string): string => {
  // 改行を<br>に変換
  return value.replace(/\n/g, '<br>')
} 