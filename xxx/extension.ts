import * as vscode from 'vscode';
import * as fs from 'fs';

// テーブル検出用の正規表現
const TABLE_REGEX = /^\|(.+\|)+$/;
// 区切り行の正規表現（ヘッダーと本文を区切る行）
const SEPARATOR_REGEX = /^\|(\s*[-:]+\s*\|)+$/;

export function activate(context: vscode.ExtensionContext) {
	if (vscode.window.activeTextEditor?.document.languageId === 'markdown') {

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
			editTableCommand, 
			changeActiveEditor,
			changeDocument
		);
	}
}

// テーブル行を検出してボタンを表示するデコレーション
function updateDecorations(editor: vscode.TextEditor) {
	try {
		const document = editor.document;
		
		// 検出されたテーブルを格納する配列
		const tables: { startLine: number; endLine: number }[] = [];
		
		let i = 0;
		while (i < document.lineCount) {
			const line = document.lineAt(i);
			
			// テーブルの開始行を検出（テーブル行かつ前の行がテーブル行でない）
			if (TABLE_REGEX.test(line.text) && (i === 0 || !TABLE_REGEX.test(document.lineAt(i - 1).text))) {
				const startLine = i;
				
				// テーブルの終了行を検索
				let endLine = startLine;
				while (endLine + 1 < document.lineCount && TABLE_REGEX.test(document.lineAt(endLine + 1).text)) {
					endLine++;
				}
				
				// 有効なテーブルかチェック（少なくとも2行以上あり、2行目が区切り行）
				if (endLine > startLine && SEPARATOR_REGEX.test(document.lineAt(startLine + 1).text)) {
					tables.push({ startLine, endLine });
				}
				
				// 次の検索位置を設定
				i = endLine + 1;
			} else {
				i++;
			}
		}
		
		// クリックイベントを登録
		const clickDisposable = vscode.languages.registerCodeLensProvider('markdown', {
			provideCodeLenses(document) {
				const codeLenses: vscode.CodeLens[] = [];
				
				// 各テーブルの開始行にCodeLensを追加
				tables.forEach(table => {
					if (table.startLine < document.lineCount) {
						const line = document.lineAt(table.startLine);
						codeLenses.push(new vscode.CodeLens(line.range, {
							title: '📝 テーブル編集',
							command: 'beautiful-markdown-editor.editTable',
							arguments: [table.startLine]
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
		
		// カーソル位置がテーブル行でない場合は検出しない
		if (!TABLE_REGEX.test(document.lineAt(startLine).text)) {
			return undefined;
		}
		
		// テーブルの開始行を見つける
		while (startLine > 0 && TABLE_REGEX.test(document.lineAt(startLine - 1).text)) {
			startLine--;
		}
		
		// テーブルの終了行を見つける
		let endLine = startLine;
		while (endLine < document.lineCount - 1 && TABLE_REGEX.test(document.lineAt(endLine + 1).text)) {
			endLine++;
		}
		
		// テーブルが少なくとも2行（ヘッダー行と区切り行）あることを確認
		if (endLine < startLine + 1) {
			vscode.window.showErrorMessage('有効なMarkdownテーブルが見つかりませんでした。ヘッダー行と区切り行が必要です。');
			return undefined;
		}
		
		// 2行目が区切り行であることを確認
		if (!SEPARATOR_REGEX.test(document.lineAt(startLine + 1).text)) {
			vscode.window.showErrorMessage('有効なMarkdownテーブルが見つかりませんでした。2行目は区切り行である必要があります。');
			return undefined;
		}
		
		// テーブルデータを抽出
		const tableLines = [];
		for (let i = startLine; i <= endLine; i++) {
			tableLines.push(document.lineAt(i).text);
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
	private _outputChannel: vscode.OutputChannel;

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
					vscode.Uri.joinPath(extensionUri, 'dist')
				]
			}
		);

		TableEditorPanel.currentPanel = new TableEditorPanel(panel, extensionUri, tableData, editor);
	}

	private constructor(
		panel: vscode.WebviewPanel, 
		extensionUri: vscode.Uri, 
		tableData: TableData, 
		editor: vscode.TextEditor
	) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._tableData = tableData;
		this._editor = editor;
		this._outputChannel = vscode.window.createOutputChannel('Beautiful Markdown Editor');
		
		// パネルが閉じられたときの処理
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		
		// パネルが表示されたときの処理
		this._panel.onDidChangeViewState(
			() => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);
		
		// メッセージ受信時のイベント
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'updateTable':
						this._updateTable(message.tableData, message.closeWebview);
						return;
					case 'debug':
						// デバッグメッセージを出力チャネルに表示
						this._outputChannel.appendLine(message.message);
						return;
					case 'ready':
						// Webviewが準備完了したらテーブルデータを送信
						this._panel.webview.postMessage({
							type: 'init',
							tableData: this._tableData
						});
						return;
					case 'getTableData':
						// テーブルデータのリクエストに応答
						this._panel.webview.postMessage({
							type: 'init',
							tableData: this._tableData
						});
						return;
				}
			},
			null,
			this._disposables
		);
		
		// パネルの内容を設定
		this._update();
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.title = 'テーブル編集';
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// HTMLファイルのパスを取得
		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.html');
		
		// HTMLファイルを読み込む
		let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
		
		// Webviewで使用するリソースのURIを取得
		const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.js'));
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'index.css'));
		
		// CSPを設定
		const nonce = getNonce();
		const csp = `
			default-src 'none';
			style-src ${webview.cspSource} 'unsafe-inline';
			script-src ${webview.cspSource} 'nonce-${nonce}';
			img-src ${webview.cspSource} https:;
			font-src ${webview.cspSource};
		`;
		
		// HTMLにCSPとnonceを追加
		htmlContent = htmlContent.replace(
			'<head>',
			`<head>
			<meta http-equiv="Content-Security-Policy" content="${csp}">`
		);
		
		// JS/CSSのパスを修正
		htmlContent = htmlContent.replace(
			'<script type="module" crossorigin src="./assets/index.js"></script>',
			`<script type="module" crossorigin src="${jsUri}" nonce="${nonce}"></script>`
		);
		
		htmlContent = htmlContent.replace(
			'<link rel="stylesheet" crossorigin href="./assets/index.css">',
			`<link rel="stylesheet" crossorigin href="${cssUri}">`
		);

		// VSCodeのAPIを初期化するスクリプトを追加
		htmlContent = htmlContent.replace(
			'window.vscode = undefined;',
			'window.vscode = acquireVsCodeApi();'
		);
		
		return htmlContent;
	}

	private _updateTable(updatedTableData: TableData, closeWebview: boolean) {
		console.log("updatedTableData", updatedTableData);
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
					if (closeWebview) {
						this.dispose();
					}
				} else {
					vscode.window.showErrorMessage('テーブルの更新に失敗しました');
				}
			}, error => {
				console.error('テーブル更新中にエラーが発生しました:', error);
				vscode.window.showErrorMessage(`テーブル更新中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
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

// ランダムなnonceを生成する関数
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

// This method is called when your extension is deactivated
export function deactivate() {}
