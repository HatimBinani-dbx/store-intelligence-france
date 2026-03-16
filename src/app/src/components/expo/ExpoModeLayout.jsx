import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ExpoHeader } from './ExpoHeader'
import { ExpoMap } from './ExpoMap'
import { ExpoCarousel, SLIDES } from './ExpoCarousel'
import { StoreDetailPanelRefactored } from '../StoreDetailPanelRefactored'
import ErrorBoundary from '../ErrorBoundary'

/**
 * Story phases for the automated demo
 */
const PHASES = {
  OVERVIEW: 'overview',        // Show all stores, portfolio KPIs
  STORE_SELECT: 'store_select', // Fly to store, show store card
  AI_INSIGHTS: 'ai_insights'   // Show AI analysis with auto-scroll
}

/**
 * Phase timing (in milliseconds)
 * AI_INSIGHTS needs extra time: ~12s animation + 12s reading = 24s
 */
const PHASE_TIMING = {
  [PHASES.OVERVIEW]: 8000,      // 8 seconds overview (more time to absorb stats)
  [PHASES.STORE_SELECT]: 6000,  // 6 seconds on store card
  [PHASES.AI_INSIGHTS]: 28000   // 28 seconds for AI insights (12s animation + 16s reading)
}

/**
 * ExpoModeLayout - Automated storytelling expo display
 * 
 * Orchestrates a narrative loop:
 * 1. Portfolio Overview (all stores, KPIs)
 * 2. Select Priority Store (fly to red store, show store card)
 * 3. AI Insights (root causes, recommendations with auto-scroll)
 * 4. Repeat with next store
 */
export function ExpoModeLayout({
  demoConfig,
  stores = [],
  storeStats,
  onExitExpo,
  onStoreSelect,
  selectedStore
}) {
  // Story state
  const [currentPhase, setCurrentPhase] = useState(PHASES.OVERVIEW)
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0)
  const [focusedStore, setFocusedStore] = useState(null)
  
  // Manual interaction state
  const [isStoreDetailOpen, setIsStoreDetailOpen] = useState(false)
  const [selectedStoreForDetail, setSelectedStoreForDetail] = useState(null)
  
  // Timeline ref for cleanup
  const timelineRef = useRef(null)

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalStores = stores.length || storeStats?.total_stores || 0
    const performances = stores.map(s => s.healthScore || s.performance_score || 0).filter(p => p > 0)
    const avgPerformance = performances.length > 0 
      ? performances.reduce((a, b) => a + b, 0) / performances.length 
      : 92.7
    const inventoryValue = totalStores * 161000
    const oosRate = Math.max(1.5, 6 - (avgPerformance - 88) * 0.4)
    
    return { totalStores, avgPerformance, inventoryValue, oosRate }
  }, [stores, storeStats])

  // Get ONLY priority (red) stores for the demo - sorted by worst performance first
  const priorityStores = useMemo(() => {
    if (!stores.length) return []
    
    const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
    const priorityThreshold = primaryMetric?.target_priority || 85
    
    return stores
      .filter(s => {
        const score = s.healthScore || s.performance_score || 100
        return score < priorityThreshold && score > 0
      })
      .sort((a, b) => (a.healthScore || a.performance_score || 100) - (b.healthScore || b.performance_score || 100))
      .slice(0, 6) // Max 6 stores to cycle through
  }, [stores, demoConfig])

  // Current store in the cycle
  const currentStore = priorityStores[currentStoreIndex] || null

  // Map current phase to carousel slide
  const currentSlide = useMemo(() => {
    switch (currentPhase) {
      case PHASES.OVERVIEW: return SLIDES.PORTFOLIO_KPIS
      case PHASES.STORE_SELECT: return SLIDES.STORE_CARD
      case PHASES.AI_INSIGHTS: return SLIDES.AI_INSIGHTS
      default: return SLIDES.PORTFOLIO_KPIS
    }
  }, [currentPhase])

  // Whether map should be in overview mode
  const isMapOverview = currentPhase === PHASES.OVERVIEW

  /**
   * Automated timeline orchestration
   */
  useEffect(() => {
    // Clear any existing timeline
    if (timelineRef.current) {
      clearTimeout(timelineRef.current)
    }

    // Don't run if no priority stores
    if (priorityStores.length === 0) return

    const runPhase = () => {
      switch (currentPhase) {
        case PHASES.OVERVIEW:
          // After overview, select a store
          setFocusedStore(null) // Clear for overview
          timelineRef.current = setTimeout(() => {
            setCurrentPhase(PHASES.STORE_SELECT)
            setFocusedStore(currentStore)
          }, PHASE_TIMING[PHASES.OVERVIEW])
          break

        case PHASES.STORE_SELECT:
          // After store selection, show AI insights
          timelineRef.current = setTimeout(() => {
            setCurrentPhase(PHASES.AI_INSIGHTS)
          }, PHASE_TIMING[PHASES.STORE_SELECT])
          break

        case PHASES.AI_INSIGHTS:
          // After insights, go back to overview with next store
          timelineRef.current = setTimeout(() => {
            // Move to next store
            setCurrentStoreIndex(prev => (prev + 1) % priorityStores.length)
            setCurrentPhase(PHASES.OVERVIEW)
          }, PHASE_TIMING[PHASES.AI_INSIGHTS])
          break
      }
    }

    runPhase()

    return () => {
      if (timelineRef.current) {
        clearTimeout(timelineRef.current)
      }
    }
  }, [currentPhase, currentStore, priorityStores.length])

  // Update focused store when store index changes (for STORE_SELECT phase)
  useEffect(() => {
    if (currentPhase !== PHASES.OVERVIEW && currentStore) {
      setFocusedStore(currentStore)
    }
  }, [currentStoreIndex, currentStore, currentPhase])

  // Handle manual store click from map
  const handleMapStoreClick = useCallback((store) => {
    setSelectedStoreForDetail(store)
    setIsStoreDetailOpen(true)
    if (onStoreSelect) {
      onStoreSelect(store)
    }
  }, [onStoreSelect])

  // Close store detail panel
  const handleCloseStoreDetail = useCallback(() => {
    setIsStoreDetailOpen(false)
    setSelectedStoreForDetail(null)
  }, [])

  // Get phase info for display
  const phaseInfo = useMemo(() => {
    switch (currentPhase) {
      case PHASES.OVERVIEW:
        return { label: 'Portfolio Overview', sublabel: `${priorityStores.length} priority stores identified` }
      case PHASES.STORE_SELECT:
        return { label: 'Store Analysis', sublabel: `Store ${currentStoreIndex + 1} of ${priorityStores.length}` }
      case PHASES.AI_INSIGHTS:
        return { label: 'AI Recommendations', sublabel: 'Analyzing root causes...' }
      default:
        return { label: '', sublabel: '' }
    }
  }, [currentPhase, currentStoreIndex, priorityStores.length])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <ExpoHeader 
        demoConfig={demoConfig}
        onExitExpo={onExitExpo}
        isPresenterActive={false}
      />

      {/* Phase Indicator Bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">{phaseInfo.label}</span>
            <span className="text-sm text-gray-500 ml-2">{phaseInfo.sublabel}</span>
          </div>
          <div className="flex items-center gap-1">
            {[PHASES.OVERVIEW, PHASES.STORE_SELECT, PHASES.AI_INSIGHTS].map((phase, idx) => (
              <div
                key={phase}
                className={`h-1 rounded-full transition-all duration-500 ${
                  phase === currentPhase 
                    ? 'w-8 bg-blue-600' 
                    : idx < [PHASES.OVERVIEW, PHASES.STORE_SELECT, PHASES.AI_INSIGHTS].indexOf(currentPhase)
                    ? 'w-4 bg-blue-300'
                    : 'w-4 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Map Section - 50% of screen (hero element) */}
      <div className="flex-[0.50] min-h-0 p-4 pb-2">
        <ExpoMap
          stores={stores}
          focusedStore={focusedStore}
          onStoreFocus={handleMapStoreClick}
          demoConfig={demoConfig}
          isOverview={isMapOverview}
        />
      </div>

      {/* Carousel Section - 50% of screen for rich content */}
      <div className="flex-[0.50] min-h-0 px-4 pb-4 pt-2 overflow-hidden">
        <ExpoCarousel
          currentSlide={currentSlide}
          focusedStore={focusedStore}
          portfolioMetrics={portfolioMetrics}
          demoConfig={demoConfig}
          storeStats={storeStats}
          stores={stores}
        />
      </div>

      {/* Store cycle indicator */}
      {priorityStores.length > 1 && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
          <span className="text-xs text-gray-500 mr-1">Store:</span>
          {priorityStores.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === currentStoreIndex 
                  ? 'bg-red-500 scale-125' 
                  : idx < currentStoreIndex
                  ? 'bg-gray-400'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Store Intelligence Detail Panel - for manual interaction */}
      <ErrorBoundary>
        <StoreDetailPanelRefactored
          store={selectedStoreForDetail}
          isOpen={isStoreDetailOpen}
          onClose={handleCloseStoreDetail}
          demoId={demoConfig?.demo_id}
          demoConfig={demoConfig}
        />
      </ErrorBoundary>
    </div>
  )
}

export default ExpoModeLayout
