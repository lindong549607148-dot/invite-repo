import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { useAuthStore } from '@/stores/auth'

import { setupMock } from '@/mock/setup'
if (import.meta.env.VITE_USE_MOCK === '1') {
  setupMock()
}

// 兜底：确保 _hasHydrated 在 persist 未及时回调时也能被设置，避免白屏
setTimeout(() => {
  if (!useAuthStore.getState()._hasHydrated) {
    useAuthStore.getState().setHasHydrated(true)
  }
}, 300)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
