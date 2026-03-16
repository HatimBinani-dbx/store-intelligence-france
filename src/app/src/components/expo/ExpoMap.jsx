import React, { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Create pulsing DivIcon for focused store - large and visible
const createPulsingIcon = (color) => {
  return L.divIcon({
    className: 'expo-pulsing-marker',
    html: `
      <div class="expo-pulse-container">
        <div class="expo-pulse-ring" style="border-color: ${color}"></div>
        <div class="expo-pulse-ring expo-pulse-ring-2" style="border-color: ${color}"></div>
        <div class="expo-pulse-dot" style="background-color: ${color}"></div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  })
}

// Helper to get store health color
const getStoreColor = (healthScore, thresholds = { optimal: 92, priority: 85 }) => {
  if (healthScore >= thresholds.optimal) return '#10b981' // green
  if (healthScore >= thresholds.priority) return '#f59e0b' // yellow
  return '#ef4444' // red
}

// Map controller for auto-zoom behavior
function MapController({ focusedStore, isOverview }) {
  const map = useMap()
  const lastFocusedRef = useRef(null)

  useEffect(() => {
    // If overview mode, zoom out to show all stores
    if (isOverview) {
      map.flyTo([39.8283, -98.5795], 4, {
        duration: 1.5,
        easeLinearity: 0.25
      })
      lastFocusedRef.current = null
      return
    }

    if (!focusedStore) return
    
    const lat = focusedStore.lat || focusedStore.latitude
    const lng = focusedStore.lng || focusedStore.longitude
    
    if (!lat || !lng) return
    
    // Only animate if store changed
    if (lastFocusedRef.current?.id !== focusedStore.id) {
      lastFocusedRef.current = focusedStore
      map.flyTo([lat, lng], 8, {
        duration: 1.5,
        easeLinearity: 0.25
      })
    }
  }, [focusedStore, isOverview, map])

  return null
}

/**
 * ExpoMap - Animated map for expo display with storytelling support
 */
export function ExpoMap({
  stores = [],
  focusedStore,
  onStoreFocus,
  demoConfig,
  isOverview = false
}) {
  // Extract thresholds from demoConfig
  const thresholds = useMemo(() => {
    const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
    return {
      optimal: primaryMetric?.target_optimal || 92,
      priority: primaryMetric?.target_priority || 85
    }
  }, [demoConfig])

  // Filter stores with valid coordinates
  const validStores = useMemo(() => {
    return stores.filter(store => {
      const lat = store.lat || store.latitude
      const lng = store.lng || store.longitude
      return lat && lng && !isNaN(lat) && !isNaN(lng)
    })
  }, [stores])

  // Default center on continental US
  const defaultCenter = [39.8283, -98.5795]
  const defaultZoom = 4

  const handleStoreClick = (store) => {
    if (onStoreFocus) {
      onStoreFocus(store)
    }
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Light theme tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <MapController 
          focusedStore={focusedStore}
          isOverview={isOverview}
        />

        {/* Store markers */}
        {validStores.map((store, index) => {
          const lat = store.lat || store.latitude
          const lng = store.lng || store.longitude
          const healthScore = store.healthScore || store.performance_score || 0
          const color = getStoreColor(healthScore, thresholds)
          const isFocused = focusedStore?.id === store.id

          return (
            <React.Fragment key={store.id || index}>
              {/* Focused store - use pulsing marker */}
              {isFocused ? (
                <Marker
                  position={[lat, lng]}
                  icon={createPulsingIcon(color)}
                  eventHandlers={{
                    click: () => handleStoreClick(store)
                  }}
                />
              ) : (
                /* Regular store dot */
                <CircleMarker
                  center={[lat, lng]}
                  radius={6}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 1.5
                  }}
                  eventHandlers={{
                    click: () => handleStoreClick(store)
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </MapContainer>

      {/* Store count overlay - top left */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 z-[1000] shadow-md border border-gray-200">
        <div className="text-gray-900 text-xl font-bold">
          {validStores.length.toLocaleString()}
        </div>
        <div className="text-gray-500 text-xs uppercase tracking-wide">
          Stores
        </div>
      </div>

      {/* Legend - bottom right */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 z-[1000] shadow-md border border-gray-200">
        <div className="text-gray-500 text-xs uppercase tracking-wide mb-2">Performance</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-700 text-sm">Optimal ≥{thresholds.optimal}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-700 text-sm">Attention</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700 text-sm">Priority &lt;{thresholds.priority}%</span>
          </div>
        </div>
      </div>

      {/* Focused store indicator - compact top right badge */}
      {focusedStore && !isOverview && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 z-[1000] shadow-md border border-gray-200">
          <div className="text-gray-500 text-xs uppercase tracking-wide">Viewing</div>
          <div className="text-gray-900 font-bold">
            Store #{focusedStore.id?.toString().replace(/\D/g, '').slice(-5) || 'Unknown'}
          </div>
          <div 
            className="text-lg font-bold"
            style={{ color: getStoreColor(focusedStore.healthScore || focusedStore.performance_score || 0, thresholds) }}
          >
            {(focusedStore.healthScore || focusedStore.performance_score || 0).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpoMap

