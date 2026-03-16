import React from 'react'
import { BrandLogo } from '../BrandLogo'
import { X } from 'lucide-react'

/**
 * ExpoHeader - Large branded header for expo displays
 * 
 * Uses demo branding configuration for colors (same as regular mode).
 * Light theme compatible - works with existing brand logos.
 */
export function ExpoHeader({ 
  demoConfig, 
  onExitExpo,
  isPresenterActive 
}) {
  const headerBgColor = demoConfig?.header_bg_color || '#ffffff'
  const headerTextColor = demoConfig?.header_text_color || '#1f2937'
  const primaryColor = demoConfig?.primary_color || '#3b82f6'
  
  // Determine if header is dark (for styling adjustments)
  const isDarkHeader = headerBgColor && 
    (headerBgColor.toLowerCase().includes('#0') || 
     headerBgColor.toLowerCase().includes('#1') ||
     headerBgColor.toLowerCase().includes('#2') ||
     headerBgColor.toLowerCase().includes('#3'))
  
  return (
    <header 
      className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between shadow-sm"
      style={{
        backgroundColor: headerBgColor,
        borderColor: '#e5e7eb',
      }}
    >
      {/* Left: Brand Logo, Name, and Live Status */}
      <div className="flex items-center gap-4">
        <BrandLogo 
          demoConfig={demoConfig} 
          size="xl" 
        />
        <div>
          <div className="flex items-center gap-3">
            <h1 
              className="text-2xl font-bold tracking-tight"
              style={{ color: headerTextColor }}
            >
              {demoConfig?.display_name || 'Store Intelligence Platform'}
            </h1>
            {/* Live indicator - moved to left side */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100">
              <div className={`w-2 h-2 rounded-full ${isPresenterActive ? 'bg-amber-500' : 'bg-emerald-500'} expo-pulse`} />
              <span className="text-xs font-medium text-gray-600">
                {isPresenterActive ? 'Demo' : 'Live'}
              </span>
            </div>
          </div>
          {demoConfig?.tagline && (
            <p 
              className="text-sm mt-0.5"
              style={{ color: headerTextColor, opacity: 0.7 }}
            >
              {demoConfig.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Right: Powered by Databricks + Exit */}
      <div className="flex items-center gap-3">
        {/* Powered by Databricks */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100">
          <span className="text-gray-500 text-xs">Powered by</span>
          <img 
            src="/databricks-logo.svg" 
            alt="Databricks" 
            className="h-4 w-auto"
          />
        </div>

        {/* Exit Expo Mode */}
        <button
          onClick={onExitExpo}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
          title="Exit Expo Mode"
        >
          <X className="w-4 h-4" />
          Exit
        </button>
      </div>
    </header>
  )
}

export default ExpoHeader

