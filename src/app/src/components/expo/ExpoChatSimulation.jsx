import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Sparkles, 
  Search, 
  BarChart3, 
  Store, 
  Target, 
  Lightbulb,
  Check,
  Loader2,
  MessageCircle,
  Bot,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react'

// Reasoning steps that show AI "thinking"
const REASONING_STEPS = [
  { icon: Search, text: 'Researching store data...' },
  { icon: BarChart3, text: 'Analyzing performance metrics...' },
  { icon: Store, text: 'Comparing to peer stores...' },
  { icon: Target, text: 'Identifying root causes...' },
  { icon: Lightbulb, text: 'Generating recommendations...' }
]

// Generate dynamic question based on store status
function getQuestion(store, portfolioAvg) {
  const performance = store?.healthScore || store?.performance_score || 0
  const gap = portfolioAvg ? portfolioAvg - performance : 10
  
  if (gap > 10) {
    return "Why is this store underperforming?"
  } else if (gap > 5) {
    return "What's causing the performance gap at this store?"
  } else {
    return "How can we improve this store's metrics?"
  }
}

// Generate structured AI response data for rich visual rendering
function generateResponseData(store, portfolioAvg, demoConfig) {
  const performance = store?.healthScore || store?.performance_score || 0
  const storeId = store?.id?.toString().replace(/\D/g, '').slice(-5) || 'Unknown'
  const city = store?.city || 'Unknown'
  const state = store?.state || ''
  
  const gap = portfolioAvg ? (portfolioAvg - performance).toFixed(1) : '5.0'
  
  // Determine tier
  const primaryMetric = demoConfig?.metrics?.find(m => m.metric_type === 'primary')
  const priorityThreshold = primaryMetric?.target_priority || 85
  const optimalThreshold = primaryMetric?.target_optimal || 92
  
  const tier = performance < priorityThreshold ? 'Priority' 
    : performance < optimalThreshold ? 'Attention' : 'Optimal'

  return {
    summary: {
      storeId,
      city,
      state,
      performance: performance.toFixed(1),
      tier,
      gap,
      portfolioAvg: portfolioAvg?.toFixed(1) || '92.7'
    },
    comparison: [
      { metric: 'Store Performance', thisStore: performance.toFixed(1) + '%', benchmark: portfolioAvg?.toFixed(1) + '%', status: 'below' },
      { metric: 'Fill Rate', thisStore: (85 + Math.random() * 5).toFixed(1) + '%', benchmark: '96.2%', status: 'below' },
      { metric: 'Days of Supply', thisStore: Math.round(50 + Math.random() * 15) + ' days', benchmark: '42 days', status: 'above' },
      { metric: 'OOS Rate', thisStore: (3 + Math.random() * 2).toFixed(1) + '%', benchmark: '2.1%', status: 'above' }
    ],
    rootCauses: [
      { cause: 'Inventory Mix Imbalance', detail: 'Over-stocking slow-moving SKUs', impact: 'High', contribution: 42 },
      { cause: 'Replenishment Timing', detail: 'Reorder triggers misaligned with demand', impact: 'Medium', contribution: 31 },
      { cause: 'Category Gap', detail: 'Key categories underperforming', impact: 'High', contribution: 27 }
    ],
    recommendations: [
      { action: 'SKU Velocity Audit', timeline: 'Immediate', impact: '+3.2%', description: 'Identify 25+ slow-moving items for markdown' },
      { action: 'Reorder Optimization', timeline: '1-2 Weeks', impact: '+4.1%', description: 'Reduce OOS events by 15-20%' },
      { action: 'Category Review', timeline: '30 Days', impact: '+3.3%', description: 'Assortment refinement in underperforming categories' }
    ],
    expectedLift: {
      value: (parseFloat(gap) * 0.6).toFixed(1),
      timeframe: '30 days',
      confidence: 'High'
    }
  }
}

/**
 * ExpoChatSimulation - Research assistant with rich visual responses
 * Features typing animation, reasoning steps, and visual data presentation
 */
export function ExpoChatSimulation({ 
  store, 
  portfolioAvg, 
  demoConfig,
  onComplete 
}) {
  const [phase, setPhase] = useState('idle') // idle | typing-in-input | sent | reasoning | revealing | complete
  const [displayedQuestion, setDisplayedQuestion] = useState('')
  const [questionSent, setQuestionSent] = useState(false) // Has question been "sent" to bubble
  const [currentReasoningStep, setCurrentReasoningStep] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [showReasoningBox, setShowReasoningBox] = useState(false)
  const [revealedSections, setRevealedSections] = useState(0) // 0-5 sections to reveal
  
  const responseContainerRef = useRef(null)
  const hasStartedRef = useRef(false)

  // Generate question and structured response data
  const question = useMemo(() => getQuestion(store, portfolioAvg), [store, portfolioAvg])
  const responseData = useMemo(() => generateResponseData(store, portfolioAvg, demoConfig), [store, portfolioAvg, demoConfig])

  // Start the animation sequence when store changes
  useEffect(() => {
    if (!store || hasStartedRef.current) return
    hasStartedRef.current = true
    
    // Reset state
    setPhase('idle')
    setDisplayedQuestion('')
    setQuestionSent(false)
    setCurrentReasoningStep(-1)
    setCompletedSteps(new Set())
    setShowReasoningBox(false)
    setRevealedSections(0)
    
    // Start typing in input box after brief delay
    const startTimer = setTimeout(() => {
      setPhase('typing-in-input')
    }, 500)

    return () => {
      clearTimeout(startTimer)
      hasStartedRef.current = false
    }
  }, [store])

  // Question typing animation (in input box)
  useEffect(() => {
    if (phase !== 'typing-in-input') return

    let charIndex = 0
    const typingInterval = setInterval(() => {
      if (charIndex < question.length) {
        setDisplayedQuestion(question.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typingInterval)
        // Brief pause, then "send" the message
        setTimeout(() => {
          setQuestionSent(true)
          setPhase('sent')
          // After message appears as bubble, start reasoning
          setTimeout(() => {
            setPhase('reasoning')
            setShowReasoningBox(true)
            setCurrentReasoningStep(0)
          }, 600)
        }, 400)
      }
    }, 60) // 60ms per character (slightly slower for readability)

    return () => clearInterval(typingInterval)
  }, [phase, question])

  // Reasoning steps animation
  useEffect(() => {
    if (phase !== 'reasoning') return
    if (currentReasoningStep < 0) return

    const stepTimer = setTimeout(() => {
      // Mark current step as complete
      setCompletedSteps(prev => new Set([...prev, currentReasoningStep]))
      
      // Move to next step or start revealing sections
      if (currentReasoningStep < REASONING_STEPS.length - 1) {
        setCurrentReasoningStep(prev => prev + 1)
      } else {
        // All reasoning done, start revealing response sections
        setTimeout(() => {
          setShowReasoningBox(false)
          setPhase('revealing')
          setRevealedSections(1) // Start revealing
        }, 500)
      }
    }, 700) // 700ms per step

    return () => clearTimeout(stepTimer)
  }, [phase, currentReasoningStep])

  // Section reveal animation - fast reveals, long pause at end for reading
  useEffect(() => {
    if (phase !== 'revealing') return
    if (revealedSections >= 5) {
      // LONG PAUSE at end so expo visitors can read the complete insights
      const completeTimer = setTimeout(() => {
        setPhase('complete')
        if (onComplete) onComplete()
      }, 12000) // 12 seconds to read all the insights before cycling
      return () => clearTimeout(completeTimer)
    }

    // Quick reveals to show content appearing (like streaming)
    const sectionTimings = [800, 1000, 1200, 1200, 1000] // ms per section - faster
    const timing = sectionTimings[revealedSections] || 1000

    const revealTimer = setTimeout(() => {
      setRevealedSections(prev => prev + 1)
      
      // Auto-scroll smoothly
      if (responseContainerRef.current) {
        responseContainerRef.current.scrollTo({
          top: responseContainerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, timing)

    return () => clearTimeout(revealTimer)
  }, [phase, revealedSections, onComplete])

  if (!store) {
    return (
      <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center">
        <div className="text-gray-400">Select a store to view analysis</div>
      </div>
    )
  }

  const { summary, comparison, rootCauses, recommendations, expectedLift } = responseData

  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-900 text-sm">AI Research Assistant</span>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={responseContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {/* User Question Bubble - only shows after "sent" */}
        {questionSent && (
          <div className="flex justify-end animate-fadeIn">
            <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm">{question}</span>
                <MessageCircle className="w-4 h-4 flex-shrink-0 opacity-70" />
              </div>
            </div>
          </div>
        )}

        {/* Reasoning Steps Box */}
        {showReasoningBox && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm animate-fadeIn">
              <div className="space-y-2">
                {REASONING_STEPS.map((step, idx) => {
                  const isComplete = completedSteps.has(idx)
                  const isActive = currentReasoningStep === idx && !isComplete
                  const isVisible = idx <= currentReasoningStep
                  
                  if (!isVisible) return null
                  
                  const Icon = step.icon
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 animate-fadeIn"
                    >
                      <div className={`w-5 h-5 flex items-center justify-center ${
                        isComplete ? 'text-emerald-500' : 'text-blue-500'
                      }`}>
                        {isComplete ? (
                          <Check className="w-4 h-4" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        isComplete ? 'text-slate-500' : 'text-slate-700'
                      }`}>
                        {step.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rich Visual Response */}
        {(phase === 'revealing' || phase === 'complete') && (
          <div className="space-y-3">
            {/* Section 1: Executive Summary Card */}
            {revealedSections >= 1 && (
              <div className="animate-fadeIn bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-600 mb-1">Analysis Complete</div>
                    <div className="text-base text-slate-800">
                      Store <span className="font-bold">#{summary.storeId}</span> in {summary.city}, {summary.state} is in the{' '}
                      <span className={`font-bold ${summary.tier === 'Priority' ? 'text-red-600' : summary.tier === 'Attention' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {summary.tier}
                      </span> tier at{' '}
                      <span className="font-bold">{summary.performance}%</span> performance.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Comparison Table */}
            {revealedSections >= 2 && (
              <div className="animate-fadeIn bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Benchmark Comparison
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {comparison.map((row, idx) => (
                    <div key={idx} className="flex items-center px-3 py-2 text-sm">
                      <div className="flex-1 text-slate-600">{row.metric}</div>
                      <div className={`w-20 text-right font-semibold ${
                        row.status === 'below' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {row.thisStore}
                      </div>
                      <div className="w-6 flex justify-center">
                        {row.status === 'below' ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="w-20 text-right text-slate-500">{row.benchmark}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Root Causes with Impact Bars */}
            {revealedSections >= 3 && (
              <div className="animate-fadeIn bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-700 uppercase tracking-wide">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Root Causes Identified
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  {rootCauses.map((cause, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800">{cause.cause}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          cause.impact === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {cause.impact}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mb-1.5">{cause.detail}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${cause.impact === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${cause.contribution}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{cause.contribution}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Recommendations Timeline */}
            {revealedSections >= 4 && (
              <div className="animate-fadeIn bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Recommended Actions
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-emerald-700">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-800">{rec.action}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timeline}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{rec.description}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        {rec.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Expected Impact */}
            {revealedSections >= 5 && (
              <div className="animate-fadeIn bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-emerald-100 text-xs uppercase tracking-wide">Expected Improvement</div>
                      <div className="text-white text-2xl font-bold">+{expectedLift.value}%</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/80 text-sm">within {expectedLift.timeframe}</div>
                    <div className="text-xs text-emerald-100 flex items-center justify-end gap-1">
                      <Check className="w-3 h-3" />
                      {expectedLift.confidence} confidence
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area - Shows typing animation */}
      <div className="flex-shrink-0 p-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className={`flex-1 px-4 py-2 rounded-full text-sm border ${
            phase === 'typing-in-input' 
              ? 'bg-white border-blue-300 ring-2 ring-blue-100' 
              : 'bg-gray-100 border-gray-200'
          }`}>
            {phase === 'typing-in-input' ? (
              <span className="text-gray-800">
                {displayedQuestion}
                <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-middle" />
              </span>
            ) : (
              <span className="text-gray-400">Ask follow-up questions...</span>
            )}
          </div>
          <button
            disabled={phase !== 'typing-in-input'}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              phase === 'typing-in-input'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExpoChatSimulation

