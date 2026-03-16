import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Helper to clean store IDs - removes prefixes like "nationwide_" and formats nicely
const formatStoreId = (id) => {
  if (!id) return 'Unknown'
  const idStr = String(id)
  // Remove common prefixes
  const cleaned = idStr.replace(/^(nationwide_|east_coast_|west_coast_|central_|south_|northeast_|france_nationwide_|france_ile_de_france_|france_nord_|france_sud_|france_ouest_|france_est_)/i, '')
  // If it's all digits, just return it; otherwise return as-is
  return cleaned
}

// Custom store marker icons based on store performance - uses dynamic thresholds
const createStoreIcon = (healthScore, thresholds = { optimal: 92, priority: 85 }) => {
  let color = '#6b7280' // gray for unknown
  
  if (healthScore >= thresholds.optimal) color = '#10b981' // green - Optimal
  else if (healthScore >= thresholds.priority) color = '#f59e0b' // yellow - Attention
  else if (healthScore < thresholds.priority) color = '#ef4444' // red - Priority
  
  return new L.DivIcon({
    html: `
      <div style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      "></div>
    `,
    className: 'custom-store-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  })
}

// Component to handle map events and updates
function MapController({ stores, onStoreSelect, selectedStore }) {
  const map = useMap()
  
  useEffect(() => {
    if (selectedStore && selectedStore.latitude && selectedStore.longitude) {
      map.setView([selectedStore.latitude, selectedStore.longitude], 13)
    }
  }, [selectedStore, map])
  
  return null
}

/**
 * Professional Zoomable Store Map using React Leaflet
 * 
 * Features:
 * - Full zoom/pan with mouse wheel and controls
 * - Individual store markers with health-based colors
 * - City-level zoom capability
 * - Store selection with popups
 * - No external API keys required (uses OpenStreetMap)
 */
export function ProfessionalZoomableMap({ 
  stores = [],
  onStoreSelect,
  selectedStore,
  demoConfig = null,
  className = ""
}) {
  const [mapReady, setMapReady] = useState(false)

  // Extract thresholds from demoConfig
  const thresholds = React.useMemo(() => {
    const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
    return {
      optimal: primaryMetric?.target_optimal || 92,
      attention: primaryMetric?.target_attention || 90,
      priority: primaryMetric?.target_priority || 85
    }
  }, [demoConfig])

  // Debug logging
  useEffect(() => {
    console.log('🗺️ ProfessionalZoomableMap received stores:', {
      storesLength: stores?.length || 0,
      firstStore: stores?.[0] ? {
        id: stores[0].id,
        lat: stores[0].lat || stores[0].latitude,
        lng: stores[0].lng || stores[0].longitude,
        healthScore: stores[0].healthScore,
        city: stores[0].city,
        state: stores[0].state
      } : null
    })
  }, [stores])

  const handleStoreClick = (store) => {
    console.log('🏪 Store selected:', store)
    if (onStoreSelect) {
      onStoreSelect(store)
    }
  }

  // Determine map center based on country/footprint
  const { defaultCenter, defaultZoom } = React.useMemo(() => {
    const country = demoConfig?.country
    const footprint = demoConfig?.footprint_type || ''
    if (country === 'FR' || footprint.startsWith('france_')) {
      return { defaultCenter: [46.6, 2.3], defaultZoom: 6 }
    }
    if (country === 'CA' || footprint.startsWith('canada_')) {
      return { defaultCenter: [56.1, -106.3], defaultZoom: 4 }
    }
    // Default: US
    return { defaultCenter: [39.8283, -98.5795], defaultZoom: 4 }
  }, [demoConfig])

  // Filter stores with valid coordinates
  const validStores = stores.filter(store => {
    const lat = store.lat || store.latitude
    const lng = store.lng || store.longitude
    return lat && lng && !isNaN(lat) && !isNaN(lng)
  })

  console.log(`📍 Valid stores for mapping: ${validStores.length}/${stores.length}`)

  return (
    <div className={cn("relative w-full h-full", className)}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setMapReady(true)}
      >
        {/* OpenStreetMap tiles - no API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Map controller for handling events */}
        <MapController 
          stores={validStores}
          onStoreSelect={onStoreSelect}
          selectedStore={selectedStore}
        />
        
        {/* Store markers */}
        {validStores.map((store, index) => {
          const lat = store.lat || store.latitude
          const lng = store.lng || store.longitude
          
          return (
            <Marker
              key={store.id || index}
              position={[lat, lng]}
              icon={createStoreIcon(store.healthScore, thresholds)}
              eventHandlers={{
                click: () => handleStoreClick(store)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Store #{formatStoreId(store.id)}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {store.city}, {store.state || store.region || ''}
                  </p>
                  {store.address && (
                    <p className="text-xs text-gray-500 mb-2">
                      {store.address}
                    </p>
                  )}
                  {store.healthScore && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">Store Performance:</span>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded",
                        store.healthScore >= thresholds.optimal ? "bg-green-100 text-green-800" :
                        store.healthScore >= thresholds.priority ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {store.healthScore}%
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleStoreClick(store)}
                    className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Store count overlay */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-[1000]">
        <div className="text-sm font-medium text-gray-900">
          {validStores.length.toLocaleString()} stores
        </div>
        <div className="text-xs text-gray-600">
          {stores.length - validStores.length > 0 && 
            `${stores.length - validStores.length} without coordinates`
          }
        </div>
      </div>

      {/* Legend - Dynamic thresholds from config */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-[1000]">
        <div className="text-xs font-medium text-gray-900 mb-2">Store Performance</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Optimal (≥{thresholds.optimal}%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-600">Attention ({thresholds.priority}-{thresholds.optimal}%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-600">Priority (&lt;{thresholds.priority}%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-600">Unknown</span>
          </div>
        </div>
      </div>

      {/* Instructions overlay */}
      <div className="absolute top-4 right-4 bg-blue-50/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-blue-200 z-[1000]">
        <div className="text-xs text-blue-800">
          🔍 <strong>Mouse wheel:</strong> Zoom in/out<br/>
          🖱️ <strong>Click & drag:</strong> Pan map<br/>
          📍 <strong>Click marker:</strong> View store details
        </div>
      </div>
    </div>
  )
}
