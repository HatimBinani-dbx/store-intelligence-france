import React, { useMemo } from 'react'
import { 
  MapPin, 
  TrendingDown, 
  TrendingUp,
  AlertTriangle, 
  Package,
  Clock,
  DollarSign,
  BarChart3,
  AlertCircle,
  Store
} from 'lucide-react'

/**
 * ExpoStoreCard - Rich store details card for expo mode
 * Shows store performance, KPIs, category breakdown, and peer comparison
 */
export function ExpoStoreCard({ store, demoConfig, portfolioAvg }) {
  if (!store) return null

  const performance = store.healthScore || store.performance_score || 0
  const storeId = store.id?.toString().replace(/\D/g, '').slice(-5) || 'Unknown'
  
  // Get thresholds
  const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
  const optimalThreshold = primaryMetric?.target_optimal || 92
  const priorityThreshold = primaryMetric?.target_priority || 85

  // Determine status
  const isPriority = performance < priorityThreshold
  const isAttention = performance >= priorityThreshold && performance < optimalThreshold
  
  const statusConfig = isPriority 
    ? { label: 'Priority', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
    : isAttention 
    ? { label: 'Attention', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' }
    : { label: 'Optimal', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' }

  // Gap from portfolio average
  const gapFromAvg = portfolioAvg ? (performance - portfolioAvg).toFixed(1) : null

  // Generate store-specific KPIs (deterministic based on performance)
  const storeKPIs = useMemo(() => {
    const basePerf = performance || 85
    return {
      daysOfSupply: Math.round(30 + (100 - basePerf) * 0.5),
      fillRate: Math.max(85, Math.min(99, basePerf + 3)),
      oosRate: Math.max(1, (100 - basePerf) * 0.15).toFixed(1),
      inventoryValue: Math.round((150000 + (basePerf - 80) * 5000) / 1000) // in $K
    }
  }, [performance])

  // Generate category breakdown for this store
  const categoryBreakdown = useMemo(() => {
    const categories = demoConfig?.metrics?.filter(m => m.metric_type === 'additional') || []
    const basePerf = performance || 85
    
    if (categories.length === 0) {
      return [
        { name: 'Prestige Makeup', perf: basePerf - 2, status: 'low' },
        { name: 'Skincare', perf: basePerf + 3, status: 'ok' },
        { name: 'Fragrance', perf: basePerf - 8, status: 'critical' },
        { name: 'Haircare', perf: basePerf + 1, status: 'ok' }
      ]
    }
    
    return categories.slice(0, 4).map((cat, idx) => {
      // Vary performance by category
      const variance = [2, -3, -8, 1][idx % 4]
      const catPerf = Math.max(60, Math.min(99, basePerf + variance))
      return {
        name: cat.display_name || cat.name,
        perf: catPerf,
        status: catPerf < priorityThreshold ? 'critical' : catPerf < optimalThreshold ? 'low' : 'ok'
      }
    })
  }, [performance, demoConfig, priorityThreshold, optimalThreshold])

  // Key issues for this store
  const keyIssues = useMemo(() => {
    const issues = []
    if (isPriority) {
      issues.push({ text: 'Below performance threshold', severity: 'high' })
      if (storeKPIs.oosRate > 2) {
        issues.push({ text: 'High out-of-stock rate', severity: 'high' })
      }
      const criticalCat = categoryBreakdown.find(c => c.status === 'critical')
      if (criticalCat) {
        issues.push({ text: `${criticalCat.name} underperforming`, severity: 'medium' })
      }
    }
    return issues.slice(0, 3)
  }, [isPriority, storeKPIs, categoryBreakdown])

  // Peer comparison (nearby/similar stores)
  const peerComparison = useMemo(() => {
    // Generate deterministic peer data based on store performance
    const basePerf = performance || 85
    return [
      { name: 'District Avg', perf: basePerf + 12, stores: 24 },
      { name: 'Region Avg', perf: basePerf + 15, stores: 156 },
      { name: 'Top Performer', perf: Math.min(98, basePerf + 22), city: 'Tampa' }
    ]
  }, [performance])

  // Regional ranking
  const regionalRanking = useMemo(() => {
    // Deterministic ranking based on performance
    const basePerf = performance || 85
    const totalInRegion = 156
    const rank = Math.max(1, Math.round(totalInRegion * (1 - (basePerf / 100))))
    const percentile = Math.round((1 - rank / totalInRegion) * 100)
    return { rank, total: totalInRegion, percentile }
  }, [performance])

  // Top underperforming items
  const underperformingItems = useMemo(() => {
    if (!isPriority && !isAttention) return []
    return [
      { sku: 'Premium Foundation', dos: 68, velocity: 'Low', impact: 'High' },
      { sku: 'Luxury Serum Set', dos: 72, velocity: 'Low', impact: 'Medium' },
      { sku: 'Holiday Gift Pack', dos: 45, velocity: 'Very Low', impact: 'High' }
    ]
  }, [isPriority, isAttention])

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Store Header + Performance */}
      <div className="flex gap-3">
        {/* Store Info + Performance */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500 text-sm">{store.city}, {store.state}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Store #{storeId}
              </h2>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${statusConfig.bg} ${statusConfig.border} border`}>
              <span className={`text-sm font-semibold ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Performance Score */}
          <div className="flex items-end gap-4">
            <div>
              <div className="text-gray-500 text-xs mb-1">Store Performance</div>
              <div className={`text-5xl font-bold ${
                isPriority ? 'text-red-600' : isAttention ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {performance.toFixed(1)}%
              </div>
            </div>
            
            {gapFromAvg && (
              <div className="pb-2">
                <div className={`flex items-center gap-1 text-lg font-semibold ${
                  parseFloat(gapFromAvg) < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {parseFloat(gapFromAvg) < 0 
                    ? <TrendingDown className="w-5 h-5" /> 
                    : <TrendingUp className="w-5 h-5" />
                  }
                  {Math.abs(parseFloat(gapFromAvg))}% vs avg
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Store KPIs */}
        <div className="w-44 flex flex-col gap-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-purple-50">
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Days Supply</div>
              <div className="text-lg font-bold text-purple-600">{storeKPIs.daysOfSupply}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-amber-50">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">OOS Rate</div>
              <div className="text-lg font-bold text-amber-600">{storeKPIs.oosRate}%</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Inventory</div>
              <div className="text-lg font-bold text-blue-600">${storeKPIs.inventoryValue}K</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Category Breakdown + Issues */}
      <div className="flex gap-3">
        {/* Category Performance */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs uppercase tracking-wide">Category Performance</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {categoryBreakdown.map((cat) => (
              <div 
                key={cat.name} 
                className={`rounded-lg p-3 ${
                  cat.status === 'critical' ? 'bg-red-50 border border-red-200' :
                  cat.status === 'low' ? 'bg-amber-50 border border-amber-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="text-xs text-gray-600 truncate mb-1">{cat.name}</div>
                <div className={`text-xl font-bold ${
                  cat.status === 'critical' ? 'text-red-600' :
                  cat.status === 'low' ? 'text-amber-600' :
                  'text-emerald-600'
                }`}>
                  {cat.perf.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Issues */}
        {keyIssues.length > 0 && (
          <div className="w-56 bg-red-50 rounded-xl border-2 border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 text-xs uppercase tracking-wide font-semibold">Key Issues</span>
            </div>
            
            <div className="space-y-2">
              {keyIssues.map((issue, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    issue.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-sm text-red-800">{issue.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-red-200">
              <div className="text-xs text-red-600">AI Analysis loading...</div>
            </div>
          </div>
        )}

        {/* If no issues (optimal store), show positive metrics */}
        {keyIssues.length === 0 && (
          <div className="w-56 bg-emerald-50 rounded-xl border-2 border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-800 text-xs uppercase tracking-wide font-semibold">Store Highlights</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
                <span className="text-sm text-emerald-800">Above portfolio average</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
                <span className="text-sm text-emerald-800">Strong fill rate</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Peer Comparison + Regional Ranking + Underperforming Items */}
      <div className="flex gap-3">
        {/* Peer Comparison */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-xs uppercase tracking-wide">Peer Comparison</span>
          </div>
          
          <div className="space-y-2">
            {peerComparison.map((peer, idx) => {
              const gap = (peer.perf - performance).toFixed(1)
              return (
                <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{peer.name}</div>
                    <div className="text-xs text-gray-400">
                      {peer.stores ? `${peer.stores} stores` : peer.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{peer.perf.toFixed(1)}%</div>
                    <div className="text-xs text-red-500">+{gap}% gap</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Regional Ranking */}
        <div className="w-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 flex flex-col items-center justify-center">
          <div className="text-xs text-blue-600 uppercase tracking-wide mb-1">Region Rank</div>
          <div className="text-4xl font-bold text-blue-700">#{regionalRanking.rank}</div>
          <div className="text-sm text-blue-600">of {regionalRanking.total}</div>
          <div className="mt-2 px-2 py-1 rounded-full bg-blue-100 text-xs font-medium text-blue-700">
            {regionalRanking.percentile}th percentile
          </div>
        </div>

        {/* Underperforming Items */}
        {underperformingItems.length > 0 && (
          <div className="w-64 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500 text-xs uppercase tracking-wide">Top Issues</span>
            </div>
            
            <div className="space-y-2">
              {underperformingItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 bg-gray-50 rounded-lg px-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{item.sku}</div>
                    <div className="text-xs text-gray-400">{item.dos} days on shelf</div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.impact === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpoStoreCard

