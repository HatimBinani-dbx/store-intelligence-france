import React from 'react'
import ReactDOM from 'react-dom/client'
import RetailApp from './RetailApp.jsx'
import './index.css'

// Make React available globally for libraries that expect it (e.g., deck.gl)
window.React = React

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RetailApp />
  </React.StrictMode>,
)