import * as vscode from 'vscode';
import * as fs from 'fs';

// テーブル検出用の正規表現
const TABLE_REGEX = /^\s*\|(.+)\|\s*$/;
const SEPARATOR_REGEX = /^\s*\|(\s*[-:]+[-|\s:]*)\|\s*$/;

// CodeLensプロバイダーを保持する変数
let currentCodeLensProvider: vscode.Disposable | undefined;

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
				updateDecorations(editor);
			}
		});
		
		// テキスト内容の変更を監視
		const changeDocument = vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document && 
				event.document.languageId === 'markdown') {
				updateDecorations(editor);
			}
		});
		
		// 初期表示時にデコレーションを更新
		if (vscode.window.activeTextEditor) {
			updateDecorations(vscode.window.activeTextEditor);
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
		// 既存のCodeLensプロバイダーがあれば破棄
		if (currentCodeLensProvider) {
			currentCodeLensProvider.dispose();
			currentCodeLensProvider = undefined;
		}
		
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
		currentCodeLensProvider = vscode.languages.registerCodeLensProvider('markdown', {
			provideCodeLenses(document) {
				const codeLenses: vscode.CodeLens[] = [];
				
				// 各テーブルの開始行にCodeLensを追加
				tables.forEach(table => {
					if (table.startLine < document.lineCount) {
						const line = document.lineAt(table.startLine);
						codeLenses.push(new vscode.CodeLens(line.range, {
							title: '📝',
							command: 'beautiful-markdown-editor.editTable',
							arguments: [table.startLine]
						}));
					}
				});
				
				return codeLenses;
			}
		});
	} catch (error) {
		console.error('デコレーションの更新中にエラーが発生しました:', error);
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
					vscode.Uri.joinPath(extensionUri, 'dist'),
					vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
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
		
		// メッセージを受信したときの処理
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				try {
					console.log('message', message);
					switch (message.command) {
						case 'updateTable':
							console.log('updateTable', message.tableData);
							// テーブルデータを更新
							if (message.tableData) {
								this._updateTable(message.tableData, message.closeWebview, message.markdownTable);
							}
							break;
						case 'getTableData':
							console.log('getTableData', this._tableData);
							// 現在のテーブルデータを送信
							this._panel.webview.postMessage({
								type: 'init',
								tableData: this._tableData
							});
							break;
						case 'ready':
							// Webviewの準備完了
							console.log('Webviewの準備完了');
							break;
					}
				} catch (error) {
					console.error('メッセージ処理中にエラーが発生しました:', error);
					vscode.window.showErrorMessage(`エラーが発生しました: ${error}`);
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
		const iconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'icons'));
		
		// CSPを設定
		const nonce = getNonce();
		const csp = `
			default-src 'none';
			style-src ${webview.cspSource} 'unsafe-inline';
			script-src ${webview.cspSource} 'nonce-${nonce}';
			img-src ${webview.cspSource} https: data:;
			font-src ${webview.cspSource};
		`;
		
		// HTMLにCSPとnonceを追加
		htmlContent = htmlContent.replace(
			'<head>',
			`<head>
			<meta http-equiv="Content-Security-Policy" content="${csp}">
			<script nonce="${nonce}">
				// SVGファイルのパスを設定
				window.ICONS_BASE_PATH = "${iconsUri.toString()}";
			</script>`
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

	private _updateTable(updatedTableData: TableData, closeWebview: boolean, markdownTableFromWebview?: string) {
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
			
			// エディタを更新
			const edit = new vscode.WorkspaceEdit();
			const range = new vscode.Range(
				new vscode.Position(Math.max(1, updatedTableData.startLine - 1), 0),
				new vscode.Position(updatedTableData.endLine, 999999)
			);
			
			// テーブルをMarkdown形式に変換
			const markdown = markdownTableFromWebview || "";
			edit.replace(this._editor.document.uri, range, markdown);
			
			// 変更を適用
			vscode.workspace.applyEdit(edit).then(success => {
				if (success) {
					console.log('テーブルを更新しました');
					// Webviewを閉じる
					if (closeWebview) {
						this._panel.dispose();
					}
				} else {
					vscode.window.showErrorMessage('テーブルの更新に失敗しました。');
				}
			});
		} catch (error) {
			console.error('テーブル更新中にエラーが発生しました:', error);
			vscode.window.showErrorMessage(`テーブル更新中にエラーが発生しました: ${error}`);
		}
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
