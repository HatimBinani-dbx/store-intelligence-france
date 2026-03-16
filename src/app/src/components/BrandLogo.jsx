import React from 'react'
import { cn } from '@/lib/utils'
import { useConfig } from '../context/ConfigContext'

/**
 * Brand Logo Component - Multi-tenant
 * 
 * Displays the configured brand logo (image if uploaded, or circle avatar with initial)
 * Can use demo-specific config (via demoConfig prop) or global config (fallback)
 */
export function BrandLogo({ 
  size = "md", 
  className = "",
  demoConfig = null  // Accept demo-specific config as prop
}) {
  const { config: globalConfig } = useConfig()
  
  // Use demo config if provided, otherwise fallback to global config
  const config = demoConfig || globalConfig
  
  const sizeClasses = {
    sm: "h-6",
    md: "h-8", 
    lg: "h-12",
    xl: "h-16"
  }

  const sizeValues = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  }

  // If logo image is configured, use it
  if (config?.logo_path) {
    // Construct proper logo URL (filename only, needs /api/logos/ prefix)
    const logoUrl = config.logo_path.startsWith('/api/logos/') 
      ? config.logo_path 
      : `/api/logos/${config.logo_path}`;
      
    // Max width constraints to prevent huge logos
    const maxWidthClasses = {
      sm: "max-w-[100px]",
      md: "max-w-[150px]",
      lg: "max-w-[200px]",
      xl: "max-w-[250px]"
    };
      
    return (
      <div className={cn("flex items-center", className)}>
        <img 
          src={logoUrl} 
          alt={config?.display_name || 'Brand'} 
          className={cn(
            sizeClasses[size], 
            maxWidthClasses[size],
            "w-auto object-contain"
          )}
          onError={(e) => {
            console.error('Failed to load logo:', logoUrl);
            // Hide broken image
            e.target.style.display = 'none';
          }}
        />
      </div>
    )
  }

  // Otherwise, render circle avatar with brand colors (no text)
  const primaryColor = config?.primary_color || '#EC0000'
  const brandName = config?.logo_text || config?.display_name || config?.demo_name || 'Store'

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg 
        width={sizeValues[size]} 
        height={sizeValues[size]} 
        viewBox="0 0 100 100"
      >
        {/* Circle background */}
        <circle cx="50" cy="50" r="45" fill={primaryColor} />
        
        {/* Letter icon */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="48"
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
        >
          {brandName.charAt(0).toUpperCase()}
        </text>
      </svg>
    </div>
  )
}
