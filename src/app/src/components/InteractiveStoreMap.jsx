import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProfessionalZoomableMap } from './ProfessionalZoomableMap'
import { 
  Filter,
  Search
} from 'lucide-react'

// Helper to clean store IDs - removes prefixes like "nationwide_" and formats nicely
const formatStoreId = (id) => {
  if (!id) return 'Unknown'
  const idStr = String(id)
  // Remove common prefixes
  const cleaned = idStr.replace(/^(nationwide_|east_coast_|west_coast_|central_|south_|northeast_|france_nationwide_|france_ile_de_france_|france_nord_|france_sud_|france_ouest_|france_est_)/i, '')
  return cleaned
}

/**
 * Interactive Store Map Component
 * 
 * Displays a map with store locations as colored dots based on health scores.
 * Features hover states, clustering, and store selection functionality.
 * Supports US, Canada, and France geographies.
 */
export function InteractiveStoreMap({ 
  stores = [],
  onStoreSelect,
  selectedStore,
  demoConfig = null,
  className = ""
}) {
  const [hoveredStore, setHoveredStore] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchState, setSearchState] = useState('')

  // Use only real store data from Unity Catalog - no fallback to mock data
  const allStores = stores || []
  
  // Extract thresholds from demoConfig (consistent with map legend)
  const thresholds = useMemo(() => {
    const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
    return {
      optimal: primaryMetric?.target_optimal || 92,
      attention: primaryMetric?.target_attention || 90,
      priority: primaryMetric?.target_priority || 85
    }
  }, [demoConfig])
  
  // Helper to determine store health category based on thresholds
  const getStoreHealthCategory = (store) => {
    const score = store.healthScore || store.performance_score || 0
    if (score >= thresholds.optimal) return 'optimal'
    if (score >= thresholds.priority) return 'attention'
    return 'priority'
  }
  
  // Debug logging
  useEffect(() => {
    console.log('🗺️ InteractiveStoreMap received stores:', {
      storesLength: stores?.length || 0,
      allStoresLength: allStores.length,
      dataSource: stores?.[0]?.dataSource || 'none'
    })
  }, [stores, allStores])
  
  // Filter stores based on health category and search
  const filteredStores = allStores.filter(store => {
    const storeCategory = getStoreHealthCategory(store)
    const statusMatch = filterStatus === 'all' || storeCategory === filterStatus
    const stateMatch = !searchState || store.state?.toLowerCase().includes(searchState.toLowerCase()) || store.city?.toLowerCase().includes(searchState.toLowerCase())
    return statusMatch && stateMatch
  })

  // Get badge styling based on store health category
  const getHealthBadgeStyle = (store) => {
    const category = getStoreHealthCategory(store)
    switch (category) {
      case 'optimal': return 'bg-green-50 text-green-700 border-green-200'
      case 'attention': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'priority': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }
  
  // Get health category label
  const getHealthLabel = (store) => {
    const category = getStoreHealthCategory(store)
    const score = store.healthScore || store.performance_score || 0
    switch (category) {
      case 'optimal': return `${score.toFixed(0)}% Optimal`
      case 'attention': return `${score.toFixed(0)}% Attention`
      case 'priority': return `${score.toFixed(0)}% Priority`
      default: return `${score.toFixed(0)}%`
    }
  }

  const handleStoreClick = (store) => {
    console.log('🎯 InteractiveStoreMap handleStoreClick:', {
      store,
      hasOnStoreSelect: !!onStoreSelect,
      React: typeof React
    });
    try {
      setHoveredStore(null) // Clear hover when clicking
      if (onStoreSelect) {
        onStoreSelect(store)
      }
    } catch (error) {
      console.error('❌ Error in InteractiveStoreMap handleStoreClick:', error);
      console.error('Stack trace:', error.stack);
    }
  }

  const handleStoreHover = (store) => {
    setHoveredStore(store)
  }

  const handleStoreLeave = () => {
    setHoveredStore(null)
  }

  return (
    <div className={cn("relative h-full bg-white border border-gray-200 rounded-lg overflow-hidden", className)}>
      {/* Map Controls - Horizontal layout at top */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-4 py-2 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search region/city..."
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              className="text-sm border-none outline-none w-32 bg-transparent"
            />
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border-none outline-none bg-transparent"
            >
              <option value="all">All Stores</option>
              <option value="optimal">Optimal (≥{thresholds.optimal}%)</option>
              <option value="attention">Attention ({thresholds.priority}-{thresholds.optimal}%)</option>
              <option value="priority">Priority (&lt;{thresholds.priority}%)</option>
            </select>
          </div>
        </div>
      </div>


      {/* Interactive US Map */}
      <div className="h-full w-full relative">
        <ProfessionalZoomableMap
          stores={filteredStores}
          onStoreSelect={handleStoreClick}
          selectedStore={selectedStore}
          demoConfig={demoConfig}
          className="h-full w-full"
        />
        
        {/* Hover Tooltip */}
        {hoveredStore && (
          <div 
            className="absolute z-30 pointer-events-none top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <Card className="shadow-lg border-gray-300 min-w-64">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">
                      Store #{formatStoreId(hoveredStore.id)} - {hoveredStore.city}, {hoveredStore.state}
                    </h4>
                    <Badge 
                      variant="outline"
                      className={cn("text-xs", getHealthBadgeStyle(hoveredStore))}
                    >
                      {getHealthLabel(hoveredStore)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Performance:</span>
                      <span className="font-medium">{(hoveredStore.healthScore || hoveredStore.performance_score || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">DOS:</span>
                      <span className="font-medium">{hoveredStore.dos_score || 45} days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  )
}
