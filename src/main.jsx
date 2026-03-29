import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// NO ROUTER HERE. App.jsx handles it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
