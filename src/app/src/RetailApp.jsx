import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { StoreIntelligencePage } from './pages/StoreIntelligencePage'
import WelcomePage from './pages/WelcomePage'
import CreateDemoWizard from './pages/CreateDemoWizard'
import { ConfigProvider } from './context/ConfigContext'

/**
 * Retail Intelligence App - Multi-tenant Store Analytics Platform
 * 
 * Multi-tenant application with configuration-driven branding
 * Configuration loaded from /config/demo-config.json (for individual demos)
 * 
 * Routes:
 * - / : Welcome page (demo selection)
 * - /demo/:slug : Individual demo view
 * - /create-demo : Demo creation wizard (future)
 * 
 * Supports multiple retail verticals:
 * - Pharmacy (Walgreens, CVS, Rite Aid)
 * - Grocery (Kroger, Safeway, Albertsons)
 * - Sporting Goods (Dick's, Academy Sports)
 * - And more...
 */
function RetailApp() {
  return (
    <Router>
      <Routes>
        {/* Welcome / Home Page - Demo Selection */}
        <Route path="/" element={<WelcomePage />} />
        
        {/* Individual Demo View (with config-driven branding) */}
        <Route 
          path="/demo/:slug" 
          element={
            <ConfigProvider>
              <StoreIntelligencePage />
            </ConfigProvider>
          } 
        />
        
        {/* Legacy route - redirect to Walgreens demo */}
        <Route path="/stores" element={<Navigate to="/demo/walgreens" replace />} />
        
            {/* Demo Creation Wizard */}
            <Route path="/create-demo" element={<CreateDemoWizard />} />
        
        {/* Catch-all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default RetailApp
