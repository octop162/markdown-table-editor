import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { convertToMarkdown } from './utils/markdownConverter';

// VSCodeのAPIを宣言
declare global {
  interface Window {
    vscode: VSCodeAPI;
  }
}

// VSCode APIのインターフェース定義
interface VSCodeAPI {
  postMessage(message: Record<string, unknown>): void;
  // 必要に応じて他のメソッドも追加
}

// グローバルな状態管理
let vscodeApi: VSCodeAPI;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  window.vscode = acquireVsCodeApi();
  vscodeApi = window.vscode;
} catch (error) {
  console.error('VSCode APIの取得に失敗しました:', error);
}

// テーブルデータの型定義
interface TableDataFromVSCode {
  startLine: number;
  endLine: number;
  headers: string[];
  rows: string[][];
}

// EditableTableで使用するデータ形式
interface EditableTableData {
  rows: {
    id: string;
    cells: { id: string; value: string }[];
  }[];
  columns: {
    id: string;
    index: number;
    width: string;
  }[];
}

// VSCodeから受け取ったテーブルデータをEditableTable用に変換する関数
function convertToEditableTableData(data: TableDataFromVSCode): EditableTableData {
  // <br>タグを改行に置換
  data.headers = data.headers.map(header => header.replace(/<br>/g, '\n'));
  data.rows = data.rows.map(row => row.map(cell => cell.replace(/<br>/g, '\n')));

  // ヘッダー行を含めた列数を取得
  const columnCount = Math.max(
    data.headers.length,
    ...data.rows.map(row => row.length)
  );

  // 列の定義を作成
  const columns = Array(columnCount).fill(0).map((_, index) => ({
    id: `column-${index}`,
    index,
    width: '100px' // デフォルト幅
  }));

  // 行データを変換（ヘッダー行を含む）
  const rows = [
    // ヘッダー行
    {
      id: 'row-header',
      cells: data.headers.map((header, index) => ({
        id: `cell-header-${index}`,
        value: header
      }))
    },
    // データ行
    ...data.rows.map((row, rowIndex) => ({
      id: `row-${rowIndex + 1}`,
      cells: row.map((cell, cellIndex) => ({
        id: `cell-${rowIndex + 1}-${cellIndex}`,
        value: cell
      }))
    }))
  ];

  // 各行のセル数を統一（足りない場合は空のセルを追加）
  rows.forEach(row => {
    while (row.cells.length < columnCount) {
      row.cells.push({
        id: `cell-${row.id}-${row.cells.length}`,
        value: ''
      });
    }
  });

  return {
    columns,
    rows
  };
}

// VSCodeにメッセージを送信する関数
function sendMessage(message: Record<string, unknown>) {
  if (vscodeApi) {
    vscodeApi.postMessage(message);
  } else {
    console.error('VSCode APIが利用できません');
  }
}

// メインアプリケーションコンポーネント
function MainApp() {
  const [tableData, setTableData] = useState<EditableTableData | null>(null);
  const [originalTableData, setOriginalTableData] = useState<TableDataFromVSCode | null>(null);

  // VSCodeからのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'init' && message.tableData) {
        console.log('テーブルデータを受信しました:', message.tableData);
        
        // 元のデータを保存
        setOriginalTableData(message.tableData);
        
        // VSCodeから受け取ったデータをEditableTable用に変換
        const convertedData = convertToEditableTableData(message.tableData);
        setTableData(convertedData);
      }
    };

    // イベントリスナーを登録
    window.addEventListener('message', handleMessage);
    
    // VSCodeに準備完了を通知
    sendMessage({ command: 'ready' });
    
    // テーブルデータをリクエスト
    sendMessage({ command: 'getTableData' });
    
    // クリーンアップ関数
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 保存ボタンが押されたときの処理
  const handleSaveTable = (markdown: string) => {
    if (!originalTableData ) return;
    
    // EditableTableのデータ形式からVSCode形式に変換
    const vscodeData = {
      startLine: originalTableData.startLine,
      endLine: originalTableData.endLine,
    };
    
    // VSCodeに更新を通知して、webviewを閉じるように指示
    sendMessage({
      command: 'updateTable',
      tableData: vscodeData,
      markdownTable: markdown, // 生成したMarkdownテーブルを追加
      closeWebview: true // webviewを閉じるフラグを追加
    });
  };

  return (
    <App 
      tableData={tableData} 
      onSaveTable={handleSaveTable}
    />
  );
}

// MainAppコンポーネントをエクスポート
export { MainApp };

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
