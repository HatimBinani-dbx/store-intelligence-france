import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { LiveMetric } from './LiveMetric'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
  Package,
  MapPin,
  Layers,
  Activity,
  Clock,
  DollarSign,
  AlertCircle
} from 'lucide-react'

/**
 * Portfolio Overview Panel - Multi-tenant Dynamic
 * 
 * Displays real-time portfolio metrics calculated from actual store data
 * All metrics and thresholds are driven by demo configuration
 */

// Region mapping for footprint-based grouping
const REGION_MAPPING = {
  nationwide: {
    'West': ['CA', 'OR', 'WA', 'NV', 'AZ'],
    'Midwest': ['IL', 'OH', 'MI', 'WI', 'MN', 'IA', 'MO', 'KS', 'NE', 'IN'],
    'Northeast': ['NY', 'PA', 'NJ', 'MA', 'CT', 'NH', 'VT', 'ME', 'RI'],
    'South': ['TX', 'FL', 'GA', 'NC', 'SC', 'VA', 'TN', 'AL', 'MS', 'LA', 'AR', 'OK'],
    'Mountain': ['CO', 'UT', 'ID', 'MT', 'WY', 'NM']
  },
  east_coast: {
    'New York': ['NY'],
    'Florida': ['FL'],
    'Pennsylvania': ['PA'],
    'New Jersey': ['NJ'],
    'Massachusetts': ['MA'],
    'Other': ['CT', 'MD', 'VA', 'NC', 'SC', 'GA', 'ME', 'NH', 'VT', 'RI', 'DE']
  },
  west_coast: {
    'California': ['CA'],
    'Washington': ['WA'],
    'Oregon': ['OR'],
    'Nevada': ['NV'],
    'Arizona': ['AZ']
  },
  central: {
    'Illinois': ['IL'],
    'Ohio': ['OH'],
    'Michigan': ['MI'],
    'Minnesota': ['MN'],
    'Wisconsin': ['WI'],
    'Other': ['IN', 'IA', 'MO', 'KS', 'NE', 'ND', 'SD']
  },
  south: {
    'Texas': ['TX'],
    'Florida': ['FL'],
    'Georgia': ['GA'],
    'Tennessee': ['TN'],
    'Other': ['LA', 'AR', 'OK', 'AL', 'MS', 'SC', 'NC']
  },
  northeast: {
    'New York': ['NY'],
    'Pennsylvania': ['PA'],
    'Massachusetts': ['MA'],
    'New Jersey': ['NJ'],
    'Other': ['CT', 'NH', 'VT', 'ME', 'RI']
  },
  france_nationwide: {
    'Île-de-France': ['Ile-de-France', 'Île-de-France'],
    'Auvergne-Rhône-Alpes': ['Rhone-Alpes', 'Auvergne', 'Auvergne-Rhône-Alpes'],
    'Nouvelle-Aquitaine': ['Aquitaine', 'Limousin', 'Poitou-Charentes', 'Nouvelle-Aquitaine'],
    'Occitanie': ['Midi-Pyrenees', 'Languedoc-Roussillon', 'Occitanie'],
    'Hauts-de-France': ['Nord-Pas-de-Calais', 'Picardie', 'Hauts-de-France'],
    'Grand Est': ['Alsace', 'Lorraine', 'Champagne-Ardenne', 'Grand Est'],
    'PACA': ['Provence-Alpes-Cote d\'Azur', 'PACA', 'Provence-Alpes-Côte d\'Azur'],
    'Pays de la Loire': ['Pays de la Loire'],
    'Bretagne': ['Brittany', 'Bretagne'],
    'Normandie': ['Lower Normandy', 'Haute-Normandie', 'Normandie'],
    'Bourgogne-Franche-Comté': ['Bourgogne', 'Franche-Comte', 'Bourgogne-Franche-Comté'],
    'Centre-Val de Loire': ['Centre', 'Centre-Val de Loire'],
    'Corse': ['Corsica', 'Corse']
  },
  france_ile_de_france: {
    'Paris': ['Paris', '75'],
    'Hauts-de-Seine': ['Hauts-de-Seine', '92'],
    'Seine-Saint-Denis': ['Seine-Saint-Denis', '93'],
    'Val-de-Marne': ['Val-de-Marne', '94'],
    'Other': ['Seine-et-Marne', 'Yvelines', 'Essonne', 'Val-d\'Oise']
  },
  france_nord: {
    'Hauts-de-France': ['Nord-Pas-de-Calais', 'Picardie', 'Hauts-de-France'],
    'Normandie': ['Lower Normandy', 'Haute-Normandie', 'Normandie'],
    'Bretagne': ['Brittany', 'Bretagne']
  },
  france_sud: {
    'PACA': ['Provence-Alpes-Cote d\'Azur', 'PACA', 'Provence-Alpes-Côte d\'Azur'],
    'Occitanie': ['Midi-Pyrenees', 'Languedoc-Roussillon', 'Occitanie'],
    'Corse': ['Corsica', 'Corse']
  },
  france_ouest: {
    'Pays de la Loire': ['Pays de la Loire'],
    'Nouvelle-Aquitaine': ['Aquitaine', 'Limousin', 'Poitou-Charentes', 'Nouvelle-Aquitaine']
  },
  france_est: {
    'Grand Est': ['Alsace', 'Lorraine', 'Champagne-Ardenne', 'Grand Est'],
    'Bourgogne-Franche-Comté': ['Bourgogne', 'Franche-Comte', 'Bourgogne-Franche-Comté'],
    'Auvergne-Rhône-Alpes': ['Rhone-Alpes', 'Auvergne', 'Auvergne-Rhône-Alpes']
  }
}

export function MarketStatsPanel({ 
  selectedStore = null,
  demoConfig = null,
  storeStats = null,
  stores = [],
  liveOOSRate = null,      // Synced from top bar LiveMetric
  liveInventoryValue = null, // Synced from top bar LiveMetric
  livePerformance = null    // Synced from top bar LiveMetric
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedSection, setSelectedSection] = useState('overview') // overview | inventory | regional | categories

  // Extract metrics from demoConfig
  const { primaryKPI, secondaryKPI, categories, thresholds } = useMemo(() => {
    if (!demoConfig?.metrics || !Array.isArray(demoConfig.metrics)) {
      return {
        primaryKPI: { display_name: 'Store Performance', target_optimal: 93, target_attention: 92, target_priority: 90 },
        secondaryKPI: { display_name: 'Days of Supply', target_optimal: 60 },
        categories: [],
        thresholds: { optimal: 93, attention: 92, priority: 90 }
      }
    }

    const primary = demoConfig.metrics.find(m => m.metric_type === 'primary') || {
      display_name: 'Store Performance',
      target_optimal: 93,
      target_attention: 92,
      target_priority: 90
    }
    
    const secondary = demoConfig.metrics.find(m => m.metric_type === 'secondary') || {
      display_name: 'Days of Supply',
      target_optimal: 60
    }
    
    const cats = demoConfig.metrics.filter(m => m.metric_type === 'additional').map(cat => {
      // Parse the description JSON for extended metadata
      let meta = { priority: 'medium', seasonality: 'medium', dos_target: 45, performance_target: 90 }
      try {
        if (cat.description) {
          meta = JSON.parse(cat.description)
        }
      } catch (e) {
        // Use defaults
      }
      return {
        ...cat,
        ...meta
      }
    })

    return {
      primaryKPI: primary,
      secondaryKPI: secondary,
      categories: cats,
      thresholds: {
        optimal: primary.target_optimal || 93,
        attention: primary.target_attention || 92,
        priority: primary.target_priority || 90
      }
    }
  }, [demoConfig])

  // Calculate portfolio metrics from stores
  const portfolioMetrics = useMemo(() => {
    if (!stores || stores.length === 0) {
      return {
        avgPerformance: 92.5,
        optimalCount: 0,
        attentionCount: 0,
        priorityCount: 0,
        totalStores: 0,
        avgDOS: 45,
        oosRate: 2.8,
        inventoryValue: 0,
        fillRate: 96.2,
        weekOverWeekChange: 1.2
      }
    }

    const totalStores = stores.length
    const performances = stores.map(s => s.healthScore || s.performance_score || 0).filter(p => p > 0)
    const avgPerformance = performances.length > 0 
      ? performances.reduce((a, b) => a + b, 0) / performances.length 
      : 0

    // Count stores by threshold
    const optimalCount = stores.filter(s => (s.healthScore || s.performance_score || 0) >= thresholds.optimal).length
    const attentionCount = stores.filter(s => {
      const score = s.healthScore || s.performance_score || 0
      return score >= thresholds.priority && score < thresholds.optimal
    }).length
    const priorityCount = stores.filter(s => (s.healthScore || s.performance_score || 0) < thresholds.priority).length

    // Calculate inventory metrics (deterministic based on performance)
    const avgDOS = Math.round(35 + (avgPerformance - 85) * 2)
    const oosRate = Math.max(1.5, 6 - (avgPerformance - 88) * 0.4).toFixed(1)
    const inventoryValue = totalStores * 161000 // ~$161K per store average (matches top bar)
    const fillRate = Math.min(99, 90 + (avgPerformance - 85) * 0.8).toFixed(1)

    // Week-over-week change (deterministic based on performance deviation from target)
    const weekOverWeekChange = ((avgPerformance - 92) * 0.3).toFixed(1)

    return {
      avgPerformance: avgPerformance.toFixed(1),
      optimalCount,
      attentionCount,
      priorityCount,
      totalStores,
      avgDOS,
      oosRate,
      inventoryValue,
      fillRate,
      weekOverWeekChange: parseFloat(weekOverWeekChange)
    }
  }, [stores, thresholds])

  // Calculate regional performance based on footprint_type
  const regionalData = useMemo(() => {
    if (!stores || stores.length === 0) return []

    const footprintType = demoConfig?.footprint_type || 'nationwide'
    const regionMap = REGION_MAPPING[footprintType] || REGION_MAPPING.nationwide

    const regionStats = {}
    let regionIndex = 0
    
    Object.entries(regionMap).forEach(([regionName, states]) => {
      const regionStores = stores.filter(s => states.includes(s.state))
      if (regionStores.length > 0) {
        const performances = regionStores.map(s => s.healthScore || s.performance_score || 0).filter(p => p > 0)
        const avgPerf = performances.length > 0 
          ? performances.reduce((a, b) => a + b, 0) / performances.length 
          : 0
        
        // Deterministic trend based on performance deviation from portfolio average
        const portfolioAvg = 92.7
        const trend = ((avgPerf - portfolioAvg) * 0.2).toFixed(1)
        
        regionStats[regionName] = {
          name: regionName,
          storeCount: regionStores.length,
          performance: avgPerf.toFixed(1),
          trend: trend
        }
        regionIndex++
      }
    })

    // Sort by store count and return top 5
    return Object.values(regionStats)
      .sort((a, b) => b.storeCount - a.storeCount)
      .slice(0, 5)
  }, [stores, demoConfig?.footprint_type])

  // Calculate category performance (deterministic based on store performance and priority)
  const categoryPerformance = useMemo(() => {
    if (!categories || categories.length === 0) return []

    const basePerf = parseFloat(portfolioMetrics.avgPerformance) || 92

    return categories.map((cat, index) => {
      // Deterministic variance based on priority and index
      const priorityBonus = cat.priority === 'critical' ? 2 : cat.priority === 'high' ? 1 : -1
      // Use index to create stable "variance" - higher index = slightly lower performance
      const indexVariance = (categories.length - index - 1) * 0.5 - 1
      const performance = Math.max(85, Math.min(99, basePerf + priorityBonus + indexVariance))
      
      // Deterministic trend based on seasonality
      const seasonTrend = cat.seasonality === 'high' ? 0.5 : cat.seasonality === 'low' ? -0.3 : 0
      const trend = ((performance - basePerf) * 0.15 + seasonTrend).toFixed(1)
      
      return {
        name: cat.display_name || cat.name,
        performance: performance.toFixed(1),
        target: cat.performance_target || cat.target_optimal || 90,
        priority: cat.priority,
        seasonality: cat.seasonality,
        trend: trend,
        isBelow: performance < (cat.performance_target || cat.target_optimal || 90)
      }
    }).sort((a, b) => parseFloat(b.performance) - parseFloat(a.performance))
  }, [categories, portfolioMetrics.avgPerformance])

  // Helper functions
  const getPerformanceColor = (value) => {
    const v = parseFloat(value)
    if (v >= thresholds.optimal) return 'text-green-600'
    if (v >= thresholds.priority) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBgColor = (value) => {
    const v = parseFloat(value)
    if (v >= thresholds.optimal) return 'bg-green-500'
    if (v >= thresholds.priority) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTrendIcon = (value) => {
    const v = parseFloat(value)
    if (v > 0.3) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (v < -0.3) return <TrendingDown className="h-3 w-3 text-red-500" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  const formatCurrency = (value) => {
    const symbol = demoConfig?.country === 'FR' ? '€' : '$'
    if (value >= 1000000000) return `${symbol}${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`
    return `${symbol}${value.toFixed(0)}`
  }

  const primaryColor = demoConfig?.primary_color || '#3b82f6'

  const belowTargetCount = categoryPerformance.filter(c => c.isBelow).length

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full rounded-lg ml-4 shadow-sm overflow-hidden">
      {/* Header - Fixed */}
      <div 
        className="p-4 border-b border-gray-200 flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-lg font-bold text-gray-900">Portfolio Overview</h2>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
        </div>
        
        {/* Quick Stats Row */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">{portfolioMetrics.totalStores.toLocaleString()} stores</span>
          <span className="text-gray-500 text-xs">
            {(() => {
              const ft = demoConfig?.footprint_type || ''
              if (ft === 'france_nationwide') return 'France - Nationwide'
              if (ft === 'france_ile_de_france') return 'Île-de-France'
              if (ft === 'france_nord') return 'Nord'
              if (ft === 'france_sud') return 'Sud'
              if (ft === 'france_ouest') return 'Ouest'
              if (ft === 'france_est') return 'Est'
              return ft.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Nationwide'
            })()}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-y-auto">
          
          {/* Primary KPI Section */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                {primaryKPI.display_name || 'Store Performance'}
              </h3>
            </div>

            {/* Big Performance Number */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <LiveMetric
                    value={parseFloat(portfolioMetrics.avgPerformance)}
                    format="percent"
                    variance={0.06}
                    updateInterval={10000}
                    className="text-4xl"
                  />
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(portfolioMetrics.weekOverWeekChange)}
                    <span className={cn(
                      "text-sm font-medium",
                      portfolioMetrics.weekOverWeekChange >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {portfolioMetrics.weekOverWeekChange >= 0 ? '+' : ''}{portfolioMetrics.weekOverWeekChange}%
                    </span>
                    <span className="text-xs text-gray-500">vs last week</span>
                  </div>
                </div>
                <div className="text-right">
                  <Activity className="h-8 w-8 text-gray-300" />
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all", getPerformanceBgColor(portfolioMetrics.avgPerformance))}
                    style={{ width: `${Math.min(100, parseFloat(portfolioMetrics.avgPerformance))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>Target: {thresholds.optimal}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Store Health Distribution */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Store Health</div>
              
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Optimal</span>
                  <span className="text-xs text-gray-500">(≥{thresholds.optimal}%)</span>
                </div>
                  <div className="text-right">
                  <span className="text-sm font-bold text-green-600">{portfolioMetrics.optimalCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({portfolioMetrics.totalStores > 0 ? Math.round(portfolioMetrics.optimalCount / portfolioMetrics.totalStores * 100) : 0}%)
                      </span>
                    </div>
                  </div>

              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Attention</span>
                  <span className="text-xs text-gray-500">({thresholds.priority}-{thresholds.optimal}%)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-yellow-600">{portfolioMetrics.attentionCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({portfolioMetrics.totalStores > 0 ? Math.round(portfolioMetrics.attentionCount / portfolioMetrics.totalStores * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Priority</span>
                  <span className="text-xs text-gray-500">(&lt;{thresholds.priority}%)</span>
                </div>
                  <div className="text-right">
                  <span className="text-sm font-bold text-red-600">{portfolioMetrics.priorityCount.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({portfolioMetrics.totalStores > 0 ? Math.round(portfolioMetrics.priorityCount / portfolioMetrics.totalStores * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

          {/* Inventory Health Section - Synced with top bar, conditional coloring */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
              <Package className="h-4 w-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Inventory Health</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Days of Supply */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-1 mb-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{secondaryKPI.display_name || 'Days of Supply'}</span>
                </div>
                <div className={cn(
                  "text-xl font-bold",
                  portfolioMetrics.avgDOS >= (secondaryKPI.target_optimal || 60) ? 'text-green-600' : 
                  portfolioMetrics.avgDOS >= 30 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {portfolioMetrics.avgDOS}
                </div>
                <div className="text-xs text-gray-500">Target: {secondaryKPI.target_optimal || 60}</div>
              </div>

              {/* OOS Rate - Synced with top bar */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">OOS Rate</span>
                </div>
                {(() => {
                  const oosValue = liveOOSRate !== null ? liveOOSRate : parseFloat(portfolioMetrics.oosRate)
                  return (
                    <div className={cn(
                      "text-xl font-bold tabular-nums transition-colors duration-300",
                      oosValue <= 3 ? 'text-green-600' : 
                      oosValue <= 5 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {oosValue.toFixed(1)}%
                    </div>
                  )
                })()}
                <div className="text-xs text-gray-500">Target: &lt;3%</div>
              </div>

              {/* Inventory Value - Synced with top bar */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-1 mb-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Inventory Value</span>
                </div>
                <div className="text-xl font-bold text-gray-900 tabular-nums transition-colors duration-300">
                  {formatCurrency(liveInventoryValue !== null ? liveInventoryValue : portfolioMetrics.inventoryValue)}
                </div>
                <div className="text-xs text-gray-500">Total portfolio</div>
              </div>

              {/* Fill Rate */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-1 mb-1">
                  <CheckCircle2 className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Fill Rate</span>
                </div>
                <div className={cn(
                  "text-xl font-bold",
                  parseFloat(portfolioMetrics.fillRate) >= 95 ? 'text-green-600' : 
                  parseFloat(portfolioMetrics.fillRate) >= 90 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {portfolioMetrics.fillRate}%
                </div>
                <div className="text-xs text-gray-500">Target: ≥95%</div>
              </div>
            </div>
          </div>

          {/* Regional Performance Section */}
          {regionalData.length > 0 && (
            <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Regional Performance</h3>
            </div>

              <div className="space-y-2">
                {regionalData.map((region, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">{region.name}</span>
                        <span className="text-xs text-gray-400">({region.storeCount})</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={cn("text-sm font-bold", getPerformanceColor(region.performance))}>
                        {region.performance}%
                      </span>
                      {getTrendIcon(region.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Performance Section */}
          {categoryPerformance.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <Layers className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Categories</h3>
                </div>
                {belowTargetCount > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {belowTargetCount} below
                  </span>
                )}
                  </div>
                  
              <div className="space-y-2">
                {categoryPerformance.slice(0, 5).map((cat, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "p-2 rounded-lg border transition-colors",
                      cat.isBelow ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className={cn("w-2 h-2 rounded-full", getPerformanceBgColor(cat.performance))}></div>
                          <span className="text-sm font-medium text-gray-700 truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5 ml-4">
                          <span className="text-xs text-gray-400 capitalize">{cat.priority}</span>
                          {cat.seasonality === 'high' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Season</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className={cn("text-sm font-bold", getPerformanceColor(cat.performance))}>
                          {cat.performance}%
                        </span>
                        {getTrendIcon(cat.trend)}
                    </div>
                    </div>
                    
                    {/* Mini progress bar */}
                    <div className="mt-2 ml-4">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getPerformanceBgColor(cat.performance))}
                          style={{ width: `${Math.min(100, parseFloat(cat.performance))}%` }}
                        />
                    </div>
                    </div>
                  </div>
                ))}
              </div>

              {categoryPerformance.length > 5 && (
                <button className="w-full mt-3 text-xs text-gray-500 hover:text-gray-700 py-2 border-t border-gray-100">
                  View all {categoryPerformance.length} categories →
                </button>
              )}
            </div>
          )}

          {/* Empty State for Categories */}
          {categoryPerformance.length === 0 && (
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Layers className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Category Performance</h3>
                  </div>
              <div className="text-center py-6 text-gray-400">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No categories configured</p>
                <p className="text-xs">Configure in demo wizard</p>
                </div>
            </div>
          )}

        </div>
      )}

      {/* Footer - Fixed at bottom */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last updated: just now</span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </span>
        </div>
      </div>
    </div>
  )
}
