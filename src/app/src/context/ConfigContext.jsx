import React, { createContext, useContext, useState, useEffect } from 'react'

/**
 * Configuration Context for Multi-Tenant Retail Demo
 * 
 * Provides application configuration throughout the component tree
 * Configuration loaded from /config/demo-config.json
 */

const ConfigContext = createContext(null)

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch configuration from public directory
      const response = await fetch('/config/demo-config.json')
      
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`)
      }
      
      const configData = await response.json()

      // Derive country and currency from footprint_type prefix
      const footprintType = configData.geography?.footprint_type || ''
      if (footprintType.startsWith('france_')) {
        configData.country = 'FR'
        configData.currency = 'EUR'
      } else if (footprintType.startsWith('canada_')) {
        configData.country = 'CA'
        configData.currency = 'CAD'
      } else {
        configData.country = configData.country || 'US'
        configData.currency = configData.currency || 'USD'
      }

      console.log('✅ Configuration loaded:', {
        brand: configData.brand.name,
        vertical: configData.brand.vertical,
        stores: configData.geography.totalStores,
        country: configData.country
      })

      setConfig(configData)
      
      // Update page title dynamically
      if (configData.brand.displayName) {
        document.title = configData.brand.displayName
      }
      
    } catch (err) {
      console.error('❌ Error loading configuration:', err)
      setError(err.message)
      
      // Fallback to default Walgreens configuration
      setConfig(getDefaultConfig())
    } finally {
      setLoading(false)
    }
  }

  // Default fallback configuration
  const getDefaultConfig = () => ({
    brand: {
      name: 'Walgreens',
      displayName: 'Walgreens Store Intelligence Platform',
      tagline: 'AI-powered insights for retail pharmacy operations',
      vertical: 'pharmacy',
      logo: {
        type: 'svg',
        primaryColor: '#EC0000',
        secondaryColor: '#336699',
        text: 'Walgreens'
      },
      colors: {
        primary: '#EC0000',
        secondary: '#336699',
        accent: '#F37520',
        success: '#00A878',
        warning: '#FFA500',
        danger: '#DC2626'
      }
    },
    country: 'US',
    currency: 'USD',
    geography: {
      totalStores: 8118
    },
    metrics: {
      primaryKPI: {
        name: 'performance',
        displayName: 'Store Performance',
        targets: {
          optimal: 93,
          attention: 92,
          priority: 90
        },
        colors: {
          optimal: '#00A878',
          attention: '#FFA500',
          priority: '#DC2626'
        },
        labels: {
          optimal: 'Optimal',
          attention: 'Attention',
          priority: 'Priority'
        }
      }
    }
  })

  const value = {
    config,
    loading,
    error,
    reloadConfig: loadConfig
  }

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  )
}

/**
 * Hook to access configuration in any component
 * @returns {Object} { config, loading, error, reloadConfig }
 */
export function useConfig() {
  const context = useContext(ConfigContext)
  
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  
  return context
}

/**
 * Higher-order component to inject config as props
 */
export function withConfig(Component) {
  return function ConfigComponent(props) {
    const { config, loading, error } = useConfig()
    return <Component {...props} config={config} configLoading={loading} configError={error} />
  }
}

export default ConfigContext

