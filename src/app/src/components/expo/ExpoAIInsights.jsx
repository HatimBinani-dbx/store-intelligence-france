import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, AlertCircle, TrendingUp, ArrowRight, Store } from 'lucide-react'

/**
 * Generate pre-scripted AI insights based on store data
 * These feel like real agent responses but are deterministic
 */
function generateInsights(store, portfolioAvg, demoConfig) {
  const performance = store?.healthScore || store?.performance_score || 0
  const storeId = store?.id?.toString().replace(/\D/g, '').slice(-5) || 'Unknown'
  const city = store?.city || 'Unknown'
  const state = store?.state || ''
  
  const gap = portfolioAvg ? (portfolioAvg - performance).toFixed(1) : '5.0'
  const dosValue = store?.dos || 45
  
  // Determine tier
  const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
  const optimalThreshold = primaryMetric?.target_optimal || 92
  const priorityThreshold = primaryMetric?.target_priority || 85
  
  const tier = performance < priorityThreshold ? 'Priority' 
    : performance < optimalThreshold ? 'Attention' : 'Optimal'

  // Root causes based on performance gap
  const rootCauses = [
    {
      cause: 'Inventory Mix Imbalance',
      detail: `Over-stocking slow-moving SKUs while high-velocity items face stockouts`,
      impact: 'High'
    },
    {
      cause: 'Replenishment Timing',
      detail: `Reorder triggers misaligned with ${dosValue > 45 ? 'extended' : 'compressed'} sell-through cycles`,
      impact: 'Medium'
    },
    {
      cause: 'Category Performance Gap',
      detail: `Key categories underperforming district average by ${gap}%`,
      impact: 'High'
    }
  ]

  // Peer comparison (simulated)
  const peers = [
    { id: `#${(parseInt(storeId) + 100).toString().padStart(5, '0')}`, city: 'Nearby', score: (performance + 8).toFixed(1), trend: 'up' },
    { id: `#${(parseInt(storeId) + 200).toString().padStart(5, '0')}`, city: 'District Avg', score: portfolioAvg?.toFixed(1) || '92.7', trend: 'stable' },
  ]

  // Recommendations
  const recommendations = [
    {
      action: 'SKU Velocity Audit',
      timeline: 'Immediate',
      impact: `Identify ${Math.floor(Math.random() * 30) + 20} slow-moving items for markdown or removal`
    },
    {
      action: 'Reorder Point Optimization',
      timeline: '1-2 Weeks',
      impact: `Reduce OOS events by an estimated 15-20%`
    },
    {
      action: 'Category Management Review',
      timeline: '30 Days',
      impact: `Target ${gap}% performance lift through assortment refinement`
    }
  ]

  return {
    summary: `Store #${storeId} (${city}, ${state}) is in the **${tier}** tier at ${performance.toFixed(1)}% performance, ${gap}% below the portfolio average.`,
    rootCauses,
    peers,
    recommendations,
    expectedLift: `+${(parseFloat(gap) * 0.6).toFixed(1)}% within 30 days`
  }
}

/**
 * ExpoAIInsights - Pre-scripted AI analysis panel with auto-scroll
 */
export function ExpoAIInsights({ 
  store, 
  portfolioAvg, 
  demoConfig,
  autoScroll = true,
  scrollDuration = 8000 // ms to scroll through content
}) {
  const containerRef = useRef(null)
  const [insights, setInsights] = useState(null)

  // Generate insights when store changes
  useEffect(() => {
    if (store) {
      setInsights(generateInsights(store, portfolioAvg, demoConfig))
    }
  }, [store, portfolioAvg, demoConfig])

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || !containerRef.current || !insights) return

    const container = containerRef.current
    const scrollHeight = container.scrollHeight - container.clientHeight
    
    if (scrollHeight <= 0) return

    // Start scrolling after a brief pause
    const startDelay = setTimeout(() => {
      const startTime = Date.now()
      
      const scroll = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / scrollDuration, 1)
        
        // Ease-in-out curve
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        
        container.scrollTop = eased * scrollHeight
        
        if (progress < 1) {
          requestAnimationFrame(scroll)
        }
      }
      
      requestAnimationFrame(scroll)
    }, 1000)

    return () => clearTimeout(startDelay)
  }, [autoScroll, insights, scrollDuration])

  if (!insights) {
    return (
      <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center">
        <div className="text-gray-400">Select a store to view insights</div>
      </div>
    )
  }

  const performance = store?.healthScore || store?.performance_score || 0

  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">AI Analysis</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="text-gray-700 leading-relaxed">
            {insights.summary.split('**').map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-gray-900">{part}</strong> : part
            )}
          </p>
        </div>

        {/* Root Causes */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Root Cause Analysis
          </h4>
          <div className="space-y-2">
            {insights.rootCauses.map((cause, idx) => (
              <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-red-800">{cause.cause}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cause.impact === 'High' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {cause.impact} Impact
                  </span>
                </div>
                <p className="text-sm text-red-700">{cause.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Peer Comparison */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <Store className="w-4 h-4 text-blue-500" />
            Peer Comparison
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {insights.peers.map((peer, idx) => (
              <div key={idx} className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 mb-1">{peer.city}</div>
                <div className="font-bold text-blue-900">{peer.id}</div>
                <div className={`text-lg font-semibold ${
                  parseFloat(peer.score) > performance ? 'text-emerald-600' : 'text-gray-600'
                }`}>
                  {peer.score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Recommended Actions
          </h4>
          <div className="space-y-2">
            {insights.recommendations.map((rec, idx) => (
              <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-emerald-800">{rec.action}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                    {rec.timeline}
                  </span>
                </div>
                <p className="text-sm text-emerald-700 ml-6">{rec.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Impact */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
          <div className="text-sm opacity-90 mb-1">Expected Performance Lift</div>
          <div className="text-3xl font-bold">{insights.expectedLift}</div>
          <div className="text-sm opacity-80 mt-1">with recommended optimizations</div>
        </div>
      </div>
    </div>
  )
}

export default ExpoAIInsights

