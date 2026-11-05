import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installCompanyScope } from '@/lib/companyScope'

installCompanyScope()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)