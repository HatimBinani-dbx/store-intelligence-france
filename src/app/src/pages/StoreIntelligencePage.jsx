import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { InteractiveStoreMap } from '../components/InteractiveStoreMap'
import { StoreDetailPanelRefactored } from '../components/StoreDetailPanelRefactored'
import { BrandLogo } from '../components/BrandLogo'
import { MarketStatsPanel } from '../components/MarketStatsPanel'
import { LiveMetric } from '../components/LiveMetric'
import { ExpoModeLayout } from '../components/expo/ExpoModeLayout'
import { fetchStores, fetchStoreStatistics } from '../api/storeAPI'
import ErrorBoundary from '../components/ErrorBoundary'
import { useConfig } from '../context/ConfigContext'
import { Building2, BarChart3, DollarSign, Package } from 'lucide-react'

/**
 * LiveKPICards - Executive summary with live updates
 * All metrics start BLACK, flash gray→green/red→black on updates
 * Values are synced to sidebar via callbacks
 */
function LiveKPICards({ stores, storeStats, onOOSChange, onInventoryChange, onPerformanceChange }) {
  // Calculate base metrics from stores
  const metrics = useMemo(() => {
    const totalStores = stores.length || storeStats?.total_stores || 0
    const performances = stores.map(s => s.healthScore || s.performance_score || 0).filter(p => p > 0)
    const avgPerformance = performances.length > 0 
      ? performances.reduce((a, b) => a + b, 0) / performances.length 
      : 92.7
    const inventoryValue = totalStores * 161000 // ~$161K per store average
    const oosRate = Math.max(1.5, 6 - (avgPerformance - 88) * 0.4)
    
    return { totalStores, avgPerformance, inventoryValue, oosRate }
  }, [stores, storeStats])

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {/* Total Stores - Static, doesn't change */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {metrics.totalStores.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Stores</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>
      
      {/* Average Performance - Live updates */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <LiveMetric
              value={metrics.avgPerformance}
              format="percent"
              variance={0.08}
              updateInterval={8000}
              className="text-2xl"
              onValueChange={onPerformanceChange}
            />
            <div className="text-sm text-gray-600">Avg Performance</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>
      
      {/* Inventory Value - Live updates */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <LiveMetric
              value={metrics.inventoryValue}
              format="currency"
              variance={200000}
              updateInterval={12000}
              className="text-2xl"
              onValueChange={onInventoryChange}
            />
            <div className="text-sm text-gray-600">Inventory Value</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>
      
      {/* OOS Rate - Live updates */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <LiveMetric
              value={metrics.oosRate}
              format="percent"
              variance={0.1}
              updateInterval={10000}
              className="text-2xl"
              onValueChange={onOOSChange}
            />
            <div className="text-sm text-gray-600">Out of Stock Rate</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Store Intelligence Page - Multi-tenant Analytics Platform
 * 
 * Main command center interface with demo-specific branding
 * Displays stores on map, statistics, and AI-powered insights
 */
export function StoreIntelligencePage() {
  const { slug: demoSlug } = useParams() // Get demo slug from URL (route param is :slug)
  const [searchParams] = useSearchParams()
  const { config: globalConfig, loading: configLoading } = useConfig()
  
  // Expo Mode state
  const [isExpoMode, setIsExpoMode] = useState(false)
  
  // Demo-specific config state
  const [demoConfig, setDemoConfig] = useState(null)
  const [selectedStore, setSelectedStore] = useState(null)
  const [isStoreDetailOpen, setIsStoreDetailOpen] = useState(false)
  
  // Real store data state
  const [stores, setStores] = useState([])
  const [storeStats, setStoreStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Live synced values - shared between top KPIs and sidebar
  const [liveOOSRate, setLiveOOSRate] = useState(null)
  const [liveInventoryValue, setLiveInventoryValue] = useState(null)
  const [livePerformance, setLivePerformance] = useState(null)
  
  // Callbacks for live value updates (memoized to prevent re-renders)
  const handleOOSChange = useCallback((val) => setLiveOOSRate(val), [])
  const handleInventoryChange = useCallback((val) => setLiveInventoryValue(val), [])
  const handlePerformanceChange = useCallback((val) => setLivePerformance(val), [])
  
  // Check URL params for expo mode and keyboard shortcut
  useEffect(() => {
    if (searchParams.get('expo') === 'true') {
      setIsExpoMode(true)
    }
    
    // Keyboard shortcut: Press 'E' to toggle expo mode
    const handleKeyPress = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        // Don't toggle if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
        setIsExpoMode(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [searchParams])

  // Load demo configuration first
  useEffect(() => {
    const loadDemoConfig = async () => {
      if (!demoSlug) {
        console.warn('⚠️ No demoSlug provided, using global config');
        setDemoConfig(globalConfig);
        return;
      }
      
      try {
        console.log(`🔍 Loading demo config for slug: ${demoSlug}`);
        const response = await fetch(`/api/demos/by-slug/${demoSlug}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch demo: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Demo config loaded:', data);
        setDemoConfig(data);
        
      } catch (err) {
        console.error('❌ Error loading demo config:', err);
        console.warn('⚠️ Falling back to global config');
        setDemoConfig(globalConfig);
      }
    };
    
    loadDemoConfig();
  }, [demoSlug, globalConfig]);

  // Load real store data after demo config is loaded
  useEffect(() => {
    if (!demoConfig) return; // Wait for config
    
    const loadStoreData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const brandName = demoConfig.display_name || demoConfig.demo_name || 'Retail';
        console.log(`🔄 Loading ${brandName} store data from Unity Catalog...`)
        
        // Extract store config from demo (values are at top level, not nested)
        const footprintType = demoConfig.footprint_type || 'nationwide';
        const storeCount = demoConfig.store_count || 1500;
        
        console.log(`📍 Fetching stores: footprint=${footprintType}, count=${storeCount}`);
        
        // Fetch stores with demo-specific parameters
        const [storesData, statsData] = await Promise.all([
          fetchStores({ 
            footprintType: footprintType,
            storeCount: storeCount,
            demoId: demoConfig.demo_id
          }),
          fetchStoreStatistics({
            footprintType: footprintType,
            demoId: demoConfig.demo_id
          })
        ])
        
        setStores(storesData)
        setStoreStats(statsData)
        
        console.log(`✅ Loaded ${storesData.length} stores with statistics:`, statsData)
        
      } catch (err) {
        console.error('❌ Error loading store data:', err)
        setError(err.message)
        
        // Fallback to mock data for development
        console.log('🔄 Falling back to mock data for development...')
        setStores([
          { id: '04782', city: 'Chicago', state: 'IL', healthScore: 42, risk: 'HIGH', lat: 41.8781, lng: -87.6298 },
          { id: '04819', city: 'Chicago', state: 'IL', healthScore: 78, risk: 'MEDIUM', lat: 41.8881, lng: -87.6398 },
          { id: '05123', city: 'New York', state: 'NY', healthScore: 85, risk: 'LOW', lat: 40.7589, lng: -73.9851 }
        ])
        setStoreStats({
          total_stores: 3,
          healthy_stores: 1,
          at_risk_stores: 1,
          critical_stores: 1
        })
      } finally {
        setLoading(false)
      }
    }

    loadStoreData()
  }, [demoConfig])

  const handleStoreSelect = (store) => {
    console.log('🏪 Store selected:', store)
    setSelectedStore(store)
    setIsStoreDetailOpen(true)
  }

  const handleCloseStoreDetail = () => {
    setIsStoreDetailOpen(false)
    setSelectedStore(null)
  }

  if (loading || configLoading || !demoConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" 
               style={{ borderColor: demoConfig?.primary_color || '#EC0000' }}></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Loading {demoConfig?.display_name || 'Store Intelligence Platform'}
            </p>
            <p className="text-sm text-gray-600">Connecting to Unity Catalog and real store data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-600 text-6xl">⚠️</div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">Connection Error</p>
            <p className="text-sm text-gray-600">Unable to load store data: {error}</p>
            <p className="text-xs text-gray-500">Running in demo mode with sample data</p>
          </div>
        </div>
      </div>
    )
  }

  // Render Expo Mode Layout when activated
  if (isExpoMode) {
    return (
      <ExpoModeLayout
        demoConfig={demoConfig}
        stores={stores}
        storeStats={storeStats}
        onExitExpo={() => setIsExpoMode(false)}
        onStoreSelect={handleStoreSelect}
        selectedStore={selectedStore}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header with Configurable Branding */}
      <header 
        className="border-b px-6 py-4"
        style={{
          backgroundColor: demoConfig?.header_bg_color || '#ffffff',
          borderColor: '#e5e7eb',
          color: demoConfig?.header_text_color || '#1f2937'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Brand Logo */}
            <div className="flex items-center space-x-3">
              <BrandLogo size="lg" demoConfig={demoConfig} />
              <div>
                <h1 
                  className="text-xl font-bold"
                  style={{ color: demoConfig?.header_text_color || '#1f2937' }}
                >
                  {demoConfig?.display_name || 'Store Intelligence Platform'}
                </h1>
                <p 
                  className="text-sm"
                  style={{ color: demoConfig?.header_text_color ? `${demoConfig.header_text_color}cc` : '#4b5563' }}
                >
                  {demoConfig?.tagline || 'AI-powered insights for retail operations'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Top Right: Store Count & Status */}
          <div className="flex items-center space-x-4">
            {/* Store Count & Status */}
            <div className="text-right">
              <div 
                className="text-sm font-medium"
                style={{ color: demoConfig?.header_text_color || '#1f2937' }}
              >
                {storeStats?.total_stores?.toLocaleString() || stores.length} stores
              </div>
              <div className="flex items-center justify-end space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span 
                  className="text-xs"
                  style={{ color: demoConfig?.header_text_color ? `${demoConfig.header_text_color}cc` : '#4b5563' }}
                >
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Executive Summary KPIs - Live updating metrics like stock tickers */}
        <LiveKPICards 
          stores={stores} 
          storeStats={storeStats} 
          demoConfig={demoConfig}
          onOOSChange={handleOOSChange}
          onInventoryChange={handleInventoryChange}
          onPerformanceChange={handlePerformanceChange}
        />

             {/* Main Content with Stats Panel - Fixed height container */}
             <div className="flex" style={{ height: 'calc(100vh - 240px)' }}>
               {/* Working Interactive Map */}
               <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                 <ErrorBoundary>
                   <InteractiveStoreMap
                     stores={stores}
                     onStoreSelect={handleStoreSelect}
                     selectedStore={selectedStore}
                     demoConfig={demoConfig}
                     className="h-full w-full"
                   />
                 </ErrorBoundary>
               </div>

              {/* Market Performance Stats Panel */}
              <ErrorBoundary>
                <MarketStatsPanel
                  selectedStore={selectedStore}
                  demoConfig={demoConfig}
                  storeStats={storeStats}
                  stores={stores}
                  liveOOSRate={liveOOSRate}
                  liveInventoryValue={liveInventoryValue}
                  livePerformance={livePerformance}
                />
              </ErrorBoundary>
             </div>
      </main>

      {/* Store Intelligence Panel */}
      <ErrorBoundary>
        <StoreDetailPanelRefactored
          store={selectedStore}
          isOpen={isStoreDetailOpen}
          onClose={handleCloseStoreDetail}
          demoId={demoConfig?.demo_id}
          demoConfig={demoConfig}
        />
      </ErrorBoundary>

      {/* Subtle Expo Mode Toggle - Bottom Right */}
      <button
        onClick={() => setIsExpoMode(true)}
        className="fixed bottom-3 right-3 text-gray-300 hover:text-gray-500 text-lg font-light transition-colors"
        title="Expo Mode"
      >
        π
      </button>
    </div>
  )
}
