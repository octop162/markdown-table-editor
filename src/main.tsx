import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 初期データ
window.addEventListener('message', (event) => {
  const { type, tableData } = event.data;
  if (type === 'init') {
    
  }
});

// VSCodeにメッセージを送信する関数
function sendMessage(message: any) {
  if (vscode) {
    vscode.postMessage(message);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
