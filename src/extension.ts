// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// テーブル検出用の正規表現
const TABLE_REGEX = /^\|(.+\|)+$/;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// コンテキストを保存する必要はなくなった
	
	// アクティベート時にMarkdownモードであることを確認
	if (vscode.window.activeTextEditor?.document.languageId === 'markdown') {
		console.log('Markdown編集モードで拡張機能がアクティブになりました！');
		
		// コマンド登録（Markdown専用機能）
		const helloCommand = vscode.commands.registerCommand('beautiful-markdown-editor.helloWorld', () => {
			vscode.window.showInformationMessage('Markdown編集モードです！しゃぶしゃぶレシピを美味しく書きましょう！');
		});
		
		// テーブル編集コマンドを登録
		const editTableCommand = vscode.commands.registerCommand('beautiful-markdown-editor.editTable', (lineNumber?: number) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}
			
			// テーブルデータを取得
			const tableData = extractTableData(editor, lineNumber);
			if (!tableData) {
				vscode.window.showInformationMessage('テーブルが見つかりませんでした');
				return;
			}
			
			// テーブル編集パネルを表示
			TableEditorPanel.createOrShow(context.extensionUri, tableData, editor);
		});
		
		// テーブル整形コマンドを登録
		const formatTableCommand = vscode.commands.registerCommand('beautiful-markdown-editor.formatTable', () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.languageId !== 'markdown') {
				vscode.window.showInformationMessage('Markdownファイルを開いてください');
				return;
			}
			
			// テーブルデータを取得
			const tableData = extractTableData(editor);
			if (!tableData) {
				vscode.window.showInformationMessage('テーブルが見つかりませんでした');
				return;
			}
			
			// テーブルを整形
			formatTable(editor, tableData);
		});
		
		// テキストエディタの変更を監視
		const changeActiveEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.languageId === 'markdown') {
				const disposable = updateDecorations(editor);
				context.subscriptions.push(disposable);
			}
		});
		
		// テキスト内容の変更を監視
		const changeDocument = vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document && 
				event.document.languageId === 'markdown') {
				const disposable = updateDecorations(editor);
				context.subscriptions.push(disposable);
			}
		});
		
		// 初期表示時にデコレーションを更新
		if (vscode.window.activeTextEditor) {
			const disposable = updateDecorations(vscode.window.activeTextEditor);
			context.subscriptions.push(disposable);
		}
		
		context.subscriptions.push(
			helloCommand, 
			editTableCommand, 
			formatTableCommand,
			changeActiveEditor,
			changeDocument
		);
	}
}

// テーブル行を検出してボタンを表示するデコレーション
function updateDecorations(editor: vscode.TextEditor) {
	try {
		const document = editor.document;
		
		// テーブルの開始行を追跡
		const tableStartLines: number[] = [];
		
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			
			// テーブル行を検出
			if (TABLE_REGEX.test(line.text)) {
				// テーブルの先頭行を検出（ヘッダー行の上）
				if (i === 0 || !TABLE_REGEX.test(document.lineAt(i-1).text)) {
					tableStartLines.push(i);
				}
			}
		}
		
		// テーブル上部に編集ボタンを表示するデコレーション
		const decorationType = vscode.window.createTextEditorDecorationType({
			after: {
				contentText: ' 📝 テーブル編集',
				color: '#4B7BEC',
				backgroundColor: 'rgba(75, 123, 236, 0.1)',
				border: '1px solid rgba(75, 123, 236, 0.3)',
				borderRadius: '4px',
				margin: '0 0 0 10px',
				cursor: 'pointer'
			},
			isWholeLine: false  // 行全体ではなく、テキスト末尾に表示
		});
		
		// デコレーションオプションを作成
		const decorations = tableStartLines.map(lineNumber => {
			const line = document.lineAt(lineNumber);
			return {
				range: new vscode.Range(
					new vscode.Position(lineNumber, line.text.length),
					new vscode.Position(lineNumber, line.text.length)
				),
				hoverMessage: 'クリックしてテーブルを編集'
			};
		});
		
		// デコレーションを適用
		editor.setDecorations(decorationType, decorations);
		
		// クリックイベントを登録
		const clickDisposable = vscode.languages.registerCodeLensProvider('markdown', {
			provideCodeLenses(document, token) {
				const codeLenses = [];
				
				// テーブルの開始行にCodeLensを追加（非表示だがクリック検出用）
				tableStartLines.forEach(lineNumber => {
					if (lineNumber < document.lineCount) {
						const line = document.lineAt(lineNumber);
						codeLenses.push(new vscode.CodeLens(line.range, {
							title: '📝',  // 表示する
							command: 'beautiful-markdown-editor.editTable',
							arguments: [lineNumber]
						}));
					}
				});
				
				return codeLenses;
			}
		});
		
		return clickDisposable;
	} catch (error) {
		console.error('デコレーションの更新中にエラーが発生しました:', error);
		return vscode.Disposable.from();
	}
}

// テーブルデータを抽出する関数を修正
function extractTableData(editor: vscode.TextEditor, startLineNumber?: number): TableData | undefined {
	try {
		const document = editor.document;
		let startLine = startLineNumber !== undefined ? startLineNumber : editor.selection.active.line;
		
		// テーブルの開始行を見つける
		while (startLine > 0 && TABLE_REGEX.test(document.lineAt(startLine).text)) {
			startLine--;
		}
		startLine++;
		
		// テーブルの終了行を見つける
		let endLine = startLine;
		while (endLine < document.lineCount - 1 && TABLE_REGEX.test(document.lineAt(endLine).text)) {
			endLine++;
		}
		if (!TABLE_REGEX.test(document.lineAt(endLine).text)) {
			endLine--;
		}
		
		// テーブルが見つからない場合
		if (startLine >= document.lineCount || !TABLE_REGEX.test(document.lineAt(startLine).text)) {
			vscode.window.showErrorMessage('テーブルが見つかりませんでした');
			return undefined;
		}
		
		// テーブルデータを抽出
		const tableLines = [];
		for (let i = startLine; i <= endLine; i++) {
			if (i < document.lineCount && TABLE_REGEX.test(document.lineAt(i).text)) {
				tableLines.push(document.lineAt(i).text);
			}
		}
		
		// テーブルの行が足りない場合
		if (tableLines.length < 3) {
			vscode.window.showErrorMessage('有効なMarkdownテーブルが見つかりませんでした。ヘッダー行、区切り行、データ行が必要です。');
			return undefined;
		}
		
		// ヘッダー行とデータ行を分離
		const headers = parseTableRow(tableLines[0]);
		const rows = tableLines.slice(2).map(line => parseTableRow(line));
		
		// 列数を統一する
		const maxColumns = Math.max(
			headers.length,
			...rows.map(row => row.length)
		);
		
		// ヘッダーの列数を調整
		while (headers.length < maxColumns) {
			headers.push('');
		}
		
		// 各行の列数を調整
		rows.forEach(row => {
			while (row.length < maxColumns) {
				row.push('');
			}
		});
		
		return {
			startLine,
			endLine,
			headers,
			rows
		};
	} catch (error) {
		console.error('テーブルデータの抽出中にエラーが発生しました:', error);
		vscode.window.showErrorMessage(`テーブルデータの抽出中にエラーが発生しました: ${error}`);
		return undefined;
	}
}

// テーブル行をパースする関数
function parseTableRow(line: string): string[] {
	return line.split('|')
		.filter(cell => cell.trim() !== '')
		.map(cell => cell.trim());
}

// テーブルデータの型定義
interface TableData {
	startLine: number;
	endLine: number;
	headers: string[];
	rows: string[][];
}

// テーブル編集パネルクラス
class TableEditorPanel {
	public static currentPanel: TableEditorPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _tableData: TableData;
	private _editor: vscode.TextEditor;

	public static createOrShow(extensionUri: vscode.Uri, tableData: TableData, editor: vscode.TextEditor) {
		// 常に右側のビューカラムに表示するように設定
		const column = vscode.ViewColumn.Beside;

		// 既存のパネルがある場合は再利用
		if (TableEditorPanel.currentPanel) {
			TableEditorPanel.currentPanel._panel.reveal(column);
			TableEditorPanel.currentPanel._tableData = tableData;
			TableEditorPanel.currentPanel._editor = editor;
			TableEditorPanel.currentPanel._update();
			return;
		}

		// 新しいパネルを作成
		const panel = vscode.window.createWebviewPanel(
			'tableEditor',
			'テーブル編集',
			column,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, 'media')
				]
			}
		);

		// エディタの参照を保持
		const editorReference = {
			document: editor.document.uri,
			viewColumn: editor.viewColumn,
			selection: editor.selection
		};

		TableEditorPanel.currentPanel = new TableEditorPanel(panel, extensionUri, tableData, editor, editorReference);
	}

	private constructor(
		panel: vscode.WebviewPanel, 
		extensionUri: vscode.Uri, 
		tableData: TableData, 
		editor: vscode.TextEditor,
		private readonly _editorReference: { document: vscode.Uri, viewColumn?: vscode.ViewColumn, selection: vscode.Selection }
	) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._tableData = tableData;
		this._editor = editor;

		// パネルの内容を設定
		this._update();

		// パネルが破棄されたときのイベント
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// メッセージ受信時のイベント
		this._panel.webview.onDidReceiveMessage(
			async message => {
				try {
					switch (message.command) {
						case 'updateTable':
							await this._updateTableInEditor(message.tableData);
							return;
					}
				} catch (error) {
					console.error('メッセージ処理中にエラーが発生しました:', error);
					vscode.window.showErrorMessage(`メッセージ処理中にエラーが発生しました: ${error}`);
				}
			},
			null,
			this._disposables
		);
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.title = 'テーブル編集';
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// テーブルデータをJSON文字列に変換
		const tableDataJson = JSON.stringify(this._tableData);

		return `<!DOCTYPE html>
		<html lang="ja">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>テーブル編集</title>
			<style>
				body {
					font-family: sans-serif;
					padding: 20px;
				}
				table {
					border-collapse: collapse;
					width: 100%;
					margin-bottom: 20px;
				}
				th, td {
					border: 1px solid #ddd;
					padding: 8px;
					text-align: left;
				}
				th {
					background-color: #f2f2f2;
				}
				button {
					padding: 8px 16px;
					margin-right: 10px;
					cursor: pointer;
				}
				.controls {
					margin-bottom: 20px;
				}
				.editable {
					min-width: 50px;
					min-height: 20px;
				}
			</style>
		</head>
		<body>
			<h1>テーブル編集</h1>
			<div class="controls">
				<button id="addRow">行を追加</button>
				<button id="addColumn">列を追加</button>
				<button id="saveTable">保存</button>
			</div>
			<div id="tableContainer"></div>
			
			<script>
				// テーブルデータを取得
				const tableData = ${tableDataJson};
				
				// VSCodeのWebviewオブジェクト
				const vscode = acquireVsCodeApi();
				
				// テーブルを描画
				function renderTable() {
					const container = document.getElementById('tableContainer');
					container.innerHTML = '';
					
					const table = document.createElement('table');
					
					// ヘッダー行
					const thead = document.createElement('thead');
					const headerRow = document.createElement('tr');
					
					tableData.headers.forEach((header, index) => {
						const th = document.createElement('th');
						th.contentEditable = 'true';
						th.className = 'editable';
						th.textContent = header;
						th.dataset.col = index;
						headerRow.appendChild(th);
					});
					
					thead.appendChild(headerRow);
					table.appendChild(thead);
					
					// データ行
					const tbody = document.createElement('tbody');
					
					tableData.rows.forEach((row, rowIndex) => {
						const tr = document.createElement('tr');
						
						row.forEach((cell, colIndex) => {
							const td = document.createElement('td');
							td.contentEditable = 'true';
							td.className = 'editable';
							td.textContent = cell;
							td.dataset.row = rowIndex;
							td.dataset.col = colIndex;
							tr.appendChild(td);
						});
						
						tbody.appendChild(tr);
					});
					
					table.appendChild(tbody);
					container.appendChild(table);
				}
				
				// 行を追加
				document.getElementById('addRow').addEventListener('click', () => {
					const newRow = Array(tableData.headers.length).fill('');
					tableData.rows.push(newRow);
					renderTable();
				});
				
				// 列を追加
				document.getElementById('addColumn').addEventListener('click', () => {
					tableData.headers.push('新しい列');
					tableData.rows.forEach(row => row.push(''));
					renderTable();
				});
				
				// テーブルを保存
				document.getElementById('saveTable').addEventListener('click', () => {
					try {
						// 編集されたテーブルデータを収集
						const headers = Array.from(document.querySelectorAll('th')).map(th => th.textContent || '');
						
						const rows = [];
						const rowElements = document.querySelectorAll('tbody tr');
						rowElements.forEach(row => {
							const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent || '');
							rows.push(cells);
						});
						
						// 列数を統一する
						const maxColumns = Math.max(
							headers.length,
							...rows.map(row => row.length)
						);
						
						// ヘッダーの列数を調整
						while (headers.length < maxColumns) {
							headers.push('');
						}
						
						// 各行の列数を調整
						rows.forEach(row => {
							while (row.length < maxColumns) {
								row.push('');
							}
						});
						
						// 更新されたテーブルデータ
						const updatedTableData = {
							startLine: tableData.startLine,
							endLine: tableData.endLine,
							headers,
							rows
						};
						
						console.log('Sending data to VS Code:', updatedTableData);
						
						// VSCodeに更新を通知
						vscode.postMessage({
							command: 'updateTable',
							tableData: updatedTableData
						});
					} catch (error) {
						console.error('Error saving table:', error);
					}
				});
				
				// 初期表示
				renderTable();
			</script>
		</body>
		</html>`;
	}

	private _updateTableInEditor(updatedTableData: TableData) {
		try {
			// エディタが有効かどうかを確認
			if (!this._editor || !this._editor.document || this._editor.document.isClosed) {
				// 現在アクティブなエディタを取得
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
					vscode.window.showErrorMessage('有効なMarkdownエディタが見つかりません。テーブルを更新できませんでした。');
					return;
				}
				// 新しいエディタを使用
				this._editor = activeEditor;
			}
			
			// Markdownテーブル形式に変換（整形あり）
			const markdownTable = this._convertToMarkdownTable(updatedTableData);
			
			// エディタのテーブルを更新
			this._editor.edit(editBuilder => {
				const startPos = new vscode.Position(updatedTableData.startLine, 0);
				const endPos = new vscode.Position(updatedTableData.endLine + 1, 0);
				const range = new vscode.Range(startPos, endPos);
				
				editBuilder.replace(range, markdownTable);
			}).then(success => {
				if (success) {
					vscode.window.showInformationMessage('テーブルを更新しました');
					// パネルを閉じる
					this.dispose();
				} else {
					vscode.window.showErrorMessage('テーブルの更新に失敗しました');
				}
			}).catch(error => {
				console.error('テーブル更新中にエラーが発生しました:', error);
				vscode.window.showErrorMessage(`テーブル更新中にエラーが発生しました: ${error.message}`);
			});
		} catch (error) {
			console.error('テーブル更新中にエラーが発生しました:', error);
			vscode.window.showErrorMessage(`テーブル更新中にエラーが発生しました: ${error}`);
		}
	}

	private _convertToMarkdownTable(tableData: TableData): string {
		// 各列の最大幅を計算（全角文字を考慮）
		const columnWidths: number[] = [];
		
		// ヘッダーの幅をチェック
		tableData.headers.forEach((header, index) => {
			columnWidths[index] = getStringWidth(header);
		});
		
		// データ行の幅をチェック
		tableData.rows.forEach(row => {
			row.forEach((cell, index) => {
				const cellWidth = getStringWidth(cell);
				if (!columnWidths[index] || cellWidth > columnWidths[index]) {
					columnWidths[index] = cellWidth;
				}
			});
		});
		
		// 最小幅を設定（3文字以上）
		const finalWidths = columnWidths.map(width => Math.max(width, 3));
		
		// ヘッダー行を整形
		const headerRow = '| ' + tableData.headers.map((header, index) => 
			padEndWithFullWidth(header, finalWidths[index])
		).join(' | ') + ' |';
		
		// 区切り行を整形
		const separatorRow = '| ' + finalWidths.map(width => 
			'-'.repeat(width)
		).join(' | ') + ' |';
		
		// データ行を整形
		const dataRows = tableData.rows.map(row => 
			'| ' + row.map((cell, index) => 
				padEndWithFullWidth(cell, finalWidths[index])
			).join(' | ') + ' |'
		);
		
		// テーブル全体
		return [headerRow, separatorRow, ...dataRows].join('\n') + '\n';
	}

	public dispose() {
		TableEditorPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}

// テーブル整形関数
function formatTable(editor: vscode.TextEditor, tableData: TableData) {
	try {
		// 各列の最大幅を計算（全角文字を考慮）
		const columnWidths: number[] = [];
		
		// ヘッダーの幅をチェック
		tableData.headers.forEach((header, index) => {
			columnWidths[index] = getStringWidth(header);
		});
		
		// データ行の幅をチェック
		tableData.rows.forEach(row => {
			row.forEach((cell, index) => {
				const cellWidth = getStringWidth(cell);
				if (!columnWidths[index] || cellWidth > columnWidths[index]) {
					columnWidths[index] = cellWidth;
				}
			});
		});
		
		// 最小幅を設定（3文字以上）
		const finalWidths = columnWidths.map(width => Math.max(width, 3));
		
		// ヘッダー行を整形
		const headerRow = '| ' + tableData.headers.map((header, index) => 
			padEndWithFullWidth(header, finalWidths[index])
		).join(' | ') + ' |';
		
		// 区切り行を整形
		const separatorRow = '| ' + finalWidths.map(width => 
			'-'.repeat(width)
		).join(' | ') + ' |';
		
		// データ行を整形
		const dataRows = tableData.rows.map(row => 
			'| ' + row.map((cell, index) => 
				padEndWithFullWidth(cell, finalWidths[index])
			).join(' | ') + ' |'
		);
		
		// 整形されたテーブル
		const formattedTable = [headerRow, separatorRow, ...dataRows].join('\n') + '\n';
		
		// エディタのテーブルを更新
		editor.edit(editBuilder => {
			const startPos = new vscode.Position(tableData.startLine, 0);
			const endPos = new vscode.Position(tableData.endLine + 1, 0);
			const range = new vscode.Range(startPos, endPos);
			
			editBuilder.replace(range, formattedTable);
		}).then(success => {
			if (success) {
				vscode.window.showInformationMessage('テーブルを整形しました');
			} else {
				vscode.window.showErrorMessage('テーブルの整形に失敗しました');
			}
		}).catch(error => {
			console.error('テーブル整形中にエラーが発生しました:', error);
			vscode.window.showErrorMessage(`テーブル整形中にエラーが発生しました: ${error.message}`);
		});
	} catch (error) {
		console.error('テーブル整形中にエラーが発生しました:', error);
		vscode.window.showErrorMessage(`テーブル整形中にエラーが発生しました: ${error}`);
	}
}

// 全角文字を考慮した文字列の表示幅を取得する関数
function getStringWidth(str: string): number {
	let width = 0;
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		// 全角文字（日本語など）は幅2としてカウント
		if (
			(code >= 0x3000 && code <= 0x9FFF) ||   // CJK統合漢字、ひらがな、カタカナなど
			(code >= 0xFF00 && code <= 0xFFEF) ||   // 全角英数字
			(code >= 0x20000 && code <= 0x2FFFF)    // CJK統合漢字拡張
		) {
			width += 2;
		} else {
			width += 1;
		}
	}
	return width;
}

// 全角文字を考慮してパディングする関数
function padEndWithFullWidth(str: string, width: number): string {
	const currentWidth = getStringWidth(str);
	if (currentWidth >= width) {
		return str;
	}
	
	// 必要なスペースの数
	const paddingSize = width - currentWidth;
	return str + ' '.repeat(paddingSize);
}

// This method is called when your extension is deactivated
export function deactivate() {}
