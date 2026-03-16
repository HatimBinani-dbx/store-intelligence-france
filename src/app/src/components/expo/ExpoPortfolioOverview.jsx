import React, { useMemo } from 'react'
import { LiveMetric } from '../LiveMetric'
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Package,
  Layers,
  Activity,
  Clock
} from 'lucide-react'

// Region mapping (same as MarketStatsPanel)
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
    'Massachusetts': ['MA']
  },
  west_coast: {
    'California': ['CA'],
    'Washington': ['WA'],
    'Oregon': ['OR'],
    'Nevada': ['NV'],
    'Arizona': ['AZ']
  }
}

/**
 * ExpoPortfolioOverview - Rich portfolio dashboard for expo overview phase
 * 
 * Shows:
 * - Hero metrics (stores, performance, trend)
 * - Store health distribution with visual bar
 * - Regional performance breakdown
 * - Key financial metrics
 */
export function ExpoPortfolioOverview({ 
  stores = [], 
  storeStats, 
  demoConfig,
  portfolioMetrics 
}) {
  // Get thresholds from config
  const thresholds = useMemo(() => {
    const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
    return {
      optimal: primaryMetric?.target_optimal || 92,
      priority: primaryMetric?.target_priority || 85
    }
  }, [demoConfig])

  // Calculate store tiers
  const storeTiers = useMemo(() => {
    if (!stores.length) return { optimal: 0, attention: 0, priority: 0 }
    
    const optimal = stores.filter(s => (s.healthScore || s.performance_score || 0) >= thresholds.optimal).length
    const priority = stores.filter(s => (s.healthScore || s.performance_score || 0) < thresholds.priority).length
    const attention = stores.length - optimal - priority
    
    return { optimal, attention, priority }
  }, [stores, thresholds])

  // Calculate regional performance
  const regionalData = useMemo(() => {
    if (!stores.length) return []

    const footprintType = demoConfig?.footprint_type || 'nationwide'
    const regionMap = REGION_MAPPING[footprintType] || REGION_MAPPING.nationwide

    const regionStats = []
    
    Object.entries(regionMap).forEach(([regionName, states]) => {
      const regionStores = stores.filter(s => states.includes(s.state))
      if (regionStores.length > 0) {
        const performances = regionStores.map(s => s.healthScore || s.performance_score || 0).filter(p => p > 0)
        const avgPerf = performances.length > 0 
          ? performances.reduce((a, b) => a + b, 0) / performances.length 
          : 0
        
        // Calculate trend based on deviation from portfolio average
        const portfolioAvg = 92.7
        const trend = ((avgPerf - portfolioAvg) * 0.2).toFixed(1)
        
        regionStats.push({
          name: regionName,
          storeCount: regionStores.length,
          performance: avgPerf,
          trend: parseFloat(trend)
        })
      }
    })

    return regionStats.sort((a, b) => b.storeCount - a.storeCount).slice(0, 5)
  }, [stores, demoConfig?.footprint_type])

  // Calculate category performance from demoConfig
  const categoryData = useMemo(() => {
    const categories = demoConfig?.metrics?.filter(m => m.metric_type === 'additional') || []
    if (categories.length === 0) {
      // Default categories if none configured
      return [
        { name: 'Prestige Makeup', performance: 94.2, trend: 1.2 },
        { name: 'Skincare', performance: 91.8, trend: -0.5 },
        { name: 'Fragrance', performance: 93.5, trend: 0.8 },
        { name: 'Haircare', performance: 89.2, trend: -1.1 }
      ]
    }

    const basePerf = portfolioMetrics?.avgPerformance || 92.7
    return categories.slice(0, 4).map((cat, index) => {
      // Deterministic performance based on category priority
      let meta = { priority: 'medium' }
      try {
        if (cat.description) meta = JSON.parse(cat.description)
      } catch (e) {}
      
      const priorityBonus = meta.priority === 'critical' ? 2 : meta.priority === 'high' ? 1 : -1
      const performance = Math.max(85, Math.min(99, basePerf + priorityBonus + (index * -0.5)))
      const trend = ((performance - basePerf) * 0.15).toFixed(1)
      
      return {
        name: cat.display_name || cat.name,
        performance: performance,
        trend: parseFloat(trend)
      }
    })
  }, [demoConfig, portfolioMetrics])

  // Operational metrics
  const operationalMetrics = useMemo(() => {
    const basePerf = portfolioMetrics?.avgPerformance || 92.7
    return {
      fillRate: Math.min(99, 90 + (basePerf - 85) * 0.8),
      daysOfSupply: Math.round(35 + (basePerf - 85) * 2),
      turnoverRate: (12 + (basePerf - 90) * 0.5).toFixed(1)
    }
  }, [portfolioMetrics])

  // Calculated metrics
  const totalStores = stores.length || portfolioMetrics?.totalStores || 0
  const avgPerformance = portfolioMetrics?.avgPerformance || 92.7
  const inventoryValue = portfolioMetrics?.inventoryValue || totalStores * 161000
  const oosRate = portfolioMetrics?.oosRate || 3.2
  
  // Week over week trend (based on performance)
  const weekTrend = ((avgPerformance - 92) * 0.3).toFixed(1)
  const trendPositive = parseFloat(weekTrend) >= 0

  // Percentages for the health bar
  const optimalPct = totalStores > 0 ? (storeTiers.optimal / totalStores * 100) : 0
  const attentionPct = totalStores > 0 ? (storeTiers.attention / totalStores * 100) : 0
  const priorityPct = totalStores > 0 ? (storeTiers.priority / totalStores * 100) : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Hero Performance + Trend + Store Count */}
      <div className="flex gap-3">
        {/* Hero Performance - Large and prominent */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Portfolio Performance</div>
            <div className="flex items-baseline gap-3">
              <LiveMetric
                value={avgPerformance}
                format="percent"
                variance={0.08}
                updateInterval={8000}
                className="text-5xl font-bold text-gray-900"
              />
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${
                trendPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {trendPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(parseFloat(weekTrend))}% WoW
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-gray-900">{totalStores.toLocaleString()}</div>
            <div className="text-gray-500 text-sm flex items-center justify-end gap-1">
              <Building2 className="w-4 h-4" />
              stores monitored
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Store Health Distribution + Priority Alert */}
      <div className="flex gap-3">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="text-gray-500 text-xs uppercase tracking-wide mb-2">Store Health Distribution</div>
          
          {/* Visual Progress Bar - Taller for visibility */}
          <div className="h-6 rounded-full overflow-hidden flex mb-3 bg-gray-100">
            <div 
              className="bg-emerald-500 transition-all duration-500 flex items-center justify-center" 
              style={{ width: `${optimalPct}%` }}
            >
              {optimalPct > 15 && <span className="text-white text-xs font-bold">{Math.round(optimalPct)}%</span>}
            </div>
            <div 
              className="bg-amber-500 transition-all duration-500 flex items-center justify-center" 
              style={{ width: `${attentionPct}%` }}
            >
              {attentionPct > 15 && <span className="text-white text-xs font-bold">{Math.round(attentionPct)}%</span>}
            </div>
            <div 
              className="bg-red-500 transition-all duration-500 flex items-center justify-center" 
              style={{ width: `${priorityPct}%` }}
            >
              {priorityPct > 10 && <span className="text-white text-xs font-bold">{Math.round(priorityPct)}%</span>}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-gray-900 text-lg">{storeTiers.optimal}</span>
              <span className="text-gray-500 text-sm">Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-gray-900 text-lg">{storeTiers.attention}</span>
              <span className="text-gray-500 text-sm">Attention</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-bold text-gray-900 text-lg">{storeTiers.priority}</span>
              <span className="text-gray-500 text-sm">Priority</span>
            </div>
          </div>
        </div>

        {/* Priority Alert - Prominent */}
        {storeTiers.priority > 0 && (
          <div className="w-48 bg-red-50 border-2 border-red-300 rounded-xl p-4 flex flex-col items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 mb-1" />
            <div className="text-red-800 font-bold text-2xl">{storeTiers.priority}</div>
            <div className="text-red-600 text-xs text-center">Priority Stores</div>
          </div>
        )}
      </div>

      {/* Row 3: Regional Performance + Financial Metrics - Compact */}
      <div className="flex gap-3">
        {/* Regional Performance - Compact list */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs uppercase tracking-wide">Regional Performance</span>
          </div>
          
          <div className="space-y-2">
            {regionalData.map((region) => {
              const barWidth = Math.min(100, (region.performance / 100) * 100)
              const isOptimal = region.performance >= thresholds.optimal
              const isPriority = region.performance < thresholds.priority
              
              return (
                <div key={region.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{region.name}</span>
                      <span className="text-xs text-gray-400">({region.storeCount})</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      isOptimal ? 'text-emerald-600' : isPriority ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {region.performance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isOptimal ? 'bg-emerald-500' : isPriority ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financial Metrics - Side by side in column */}
        <div className="w-48 flex flex-col gap-3">
          {/* Inventory Value */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-blue-50">
                <DollarSign className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Inventory</span>
            </div>
            <LiveMetric
              value={inventoryValue}
              format="currency"
              variance={200000}
              updateInterval={12000}
              className="text-xl font-bold text-blue-600"
            />
          </div>

          {/* OOS Rate */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-amber-50">
                <Package className="w-3 h-3 text-amber-600" />
              </div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">OOS Rate</span>
            </div>
            <LiveMetric
              value={oosRate}
              format="percent"
              variance={0.1}
              updateInterval={10000}
              className="text-xl font-bold text-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Category Performance + Operational Metrics */}
      <div className="flex gap-3">
        {/* Category Performance */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs uppercase tracking-wide">Category Performance</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {categoryData.map((category) => {
              const isOptimal = category.performance >= thresholds.optimal
              const isPriority = category.performance < thresholds.priority
              
              return (
                <div key={category.name} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 truncate">{category.name}</span>
                    <div className={`flex items-center gap-0.5 text-xs ${
                      category.trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {category.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(category.trend)}%
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${
                    isOptimal ? 'text-emerald-600' : isPriority ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {category.performance.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="w-48 flex flex-col gap-3">
          {/* Fill Rate */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-emerald-50">
                <Activity className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Fill Rate</span>
            </div>
            <div className="text-xl font-bold text-emerald-600">
              {operationalMetrics.fillRate.toFixed(1)}%
            </div>
          </div>

          {/* Days of Supply */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded-lg bg-purple-50">
                <Clock className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Avg DOS</span>
            </div>
            <div className="text-xl font-bold text-purple-600">
              {operationalMetrics.daysOfSupply} days
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

