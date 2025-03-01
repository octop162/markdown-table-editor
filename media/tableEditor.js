// // テーブルデータを取得
// const tableData = TABLE_DATA_PLACEHOLDER;

// // VSCodeのWebviewオブジェクト
// const vscode = acquireVsCodeApi();

// // テーブルを描画
// function renderTable() {
//     const container = document.getElementById('tableContainer');
//     container.innerHTML = '';
    
//     const table = document.createElement('table');
    
//     // ヘッダー行
//     const thead = document.createElement('thead');
//     const headerRow = document.createElement('tr');
    
//     tableData.headers.forEach((header, index) => {
//         const th = document.createElement('th');
//         th.contentEditable = 'true';
//         th.className = 'editable';
//         // <br>タグを実際の改行に変換して表示
//         th.innerHTML = header.replace(/<br>/g, '\\n').replace(/\\n/g, '<br>');
//         th.dataset.col = index;
//         headerRow.appendChild(th);
//     });
    
//     thead.appendChild(headerRow);
//     table.appendChild(thead);
    
//     // データ行
//     const tbody = document.createElement('tbody');
    
//     tableData.rows.forEach((row, rowIndex) => {
//         const tr = document.createElement('tr');
        
//         row.forEach((cell, colIndex) => {
//             const td = document.createElement('td');
//             td.contentEditable = 'true';
//             td.className = 'editable';
//             // <br>タグを実際の改行に変換して表示
//             td.innerHTML = cell.replace(/<br>/g, '\\n').replace(/\\n/g, '<br>');
//             td.dataset.row = rowIndex;
//             td.dataset.col = colIndex;
//             tr.appendChild(td);
//         });
        
//         tbody.appendChild(tr);
//     });
    
//     table.appendChild(tbody);
//     container.appendChild(table);
// }

// // 行を追加
// document.getElementById('addRow').addEventListener('click', () => {
//     const newRow = Array(tableData.headers.length).fill('');
//     tableData.rows.push(newRow);
//     renderTable();
// });

// // 列を追加
// document.getElementById('addColumn').addEventListener('click', () => {
//     tableData.headers.push('新しい列');
//     tableData.rows.forEach(row => row.push(''));
//     renderTable();
// });

// // テーブルを保存
// document.getElementById('saveTable').addEventListener('click', () => {
//     try {
//         // 編集されたテーブルデータを収集
//         const headers = Array.from(document.querySelectorAll('th')).map(th => {
//             // 改行を<br>タグに変換して保存
//             return th.innerHTML.replace(/<div>/g, '<br>').replace(/<\/div>/g, '').replace(/<br>/g, '<br>');
//         });
        
//         const rows = [];
//         const rowElements = document.querySelectorAll('tbody tr');
//         rowElements.forEach(row => {
//             const cells = Array.from(row.querySelectorAll('td')).map(td => {
//                 // 改行を<br>タグに変換して保存
//                 return td.innerHTML.replace(/<div>/g, '<br>').replace(/<\/div>/g, '').replace(/<br>/g, '<br>');
//             });
//             rows.push(cells);
//         });
        
//         // 列数を統一する
//         const maxColumns = Math.max(
//             headers.length,
//             ...rows.map(row => row.length)
//         );
        
//         // ヘッダーの列数を調整
//         while (headers.length < maxColumns) {
//             headers.push('');
//         }
        
//         // 各行の列数を調整
//         rows.forEach(row => {
//             while (row.length < maxColumns) {
//                 row.push('');
//             }
//         });
        
//         // 更新されたテーブルデータ
//         const updatedTableData = {
//             startLine: tableData.startLine,
//             endLine: tableData.endLine,
//             headers,
//             rows
//         };
        
//         console.log('Sending data to VS Code:', updatedTableData);
        
//         // VSCodeに更新を通知
//         vscode.postMessage({
//             command: 'updateTable',
//             tableData: updatedTableData
//         });
//     } catch (error) {
//         console.error('Error saving table:', error);
//     }
// });

// // 初期表示
// renderTable(); 