// @react-pdf/renderer usa `Buffer` (API de Node) para procesar imágenes.
// El navegador no lo trae, así que lo exponemos globalmente antes de todo.
import { Buffer } from 'buffer'
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
