import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline start for the home-server version. Browsers allow this only on
// https or localhost; claude.ai pages and the single file never register it.
if ('serviceWorker' in navigator && window.isSecureContext && location.protocol.startsWith('http') && !window.claude) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
