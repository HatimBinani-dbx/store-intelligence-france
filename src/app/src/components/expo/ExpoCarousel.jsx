import React, { useEffect, useState, useRef } from 'react'
import { ExpoPortfolioOverview } from './ExpoPortfolioOverview'
import { ExpoStoreCard } from './ExpoStoreCard'
import { ExpoChatSimulation } from './ExpoChatSimulation'

/**
 * Slide identifiers for the carousel
 */
export const SLIDES = {
  PORTFOLIO_KPIS: 'portfolio_kpis',
  STORE_CARD: 'store_card',
  AI_INSIGHTS: 'ai_insights'
}

/**
 * ExpoCarousel - Animated carousel for storytelling flow
 * 
 * Slides:
 * 1. Portfolio KPIs (overview mode)
 * 2. Store Card (when store selected)
 * 3. AI Insights (analysis phase)
 */
export function ExpoCarousel({
  currentSlide,
  focusedStore,
  portfolioMetrics,
  demoConfig,
  storeStats,
  stores = [],
  onSlideChange
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displaySlide, setDisplaySlide] = useState(currentSlide)
  const containerRef = useRef(null)

  // Handle slide transitions
  useEffect(() => {
    if (currentSlide !== displaySlide) {
      setIsAnimating(true)
      
      // Fade out, change slide, fade in
      const timeout = setTimeout(() => {
        setDisplaySlide(currentSlide)
        setTimeout(() => setIsAnimating(false), 50)
      }, 300)
      
      return () => clearTimeout(timeout)
    }
  }, [currentSlide, displaySlide])

  // Calculate portfolio average for comparison
  const portfolioAvg = portfolioMetrics?.avgPerformance || storeStats?.avg_performance || 92.7

  // Render the current slide content
  const renderSlide = () => {
    switch (displaySlide) {
      case SLIDES.PORTFOLIO_KPIS:
        return (
          <ExpoPortfolioOverview
            stores={stores}
            storeStats={storeStats}
            demoConfig={demoConfig}
            portfolioMetrics={portfolioMetrics}
          />
        )
      
      case SLIDES.STORE_CARD:
        return (
          <ExpoStoreCard
            store={focusedStore}
            demoConfig={demoConfig}
            portfolioAvg={portfolioAvg}
          />
        )
      
      case SLIDES.AI_INSIGHTS:
        return (
          <ExpoChatSimulation
            store={focusedStore}
            portfolioAvg={portfolioAvg}
            demoConfig={demoConfig}
          />
        )
      
      default:
        return (
          <ExpoPortfolioOverview
            stores={stores}
            storeStats={storeStats}
            demoConfig={demoConfig}
            portfolioMetrics={portfolioMetrics}
          />
        )
    }
  }

  // Slide order for indicators
  const slideOrder = [SLIDES.PORTFOLIO_KPIS, SLIDES.STORE_CARD, SLIDES.AI_INSIGHTS]
  const currentIndex = slideOrder.indexOf(displaySlide)

  // AI Insights needs full height for scrolling, others should be compact
  const needsFullHeight = displaySlide === SLIDES.AI_INSIGHTS

  return (
    <div 
      ref={containerRef}
      className="relative h-full flex flex-col"
    >
      {/* Slide Content */}
      <div 
        className={`transition-opacity duration-300 ${
          needsFullHeight ? 'flex-1 min-h-0' : ''
        } ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
      >
        {renderSlide()}
      </div>

      {/* Slide Indicators */}
      <div className="flex-shrink-0 pt-2 flex items-center justify-center gap-2">
        {slideOrder.map((slide, idx) => (
          <div
            key={slide}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex 
                ? 'w-6 bg-blue-600' 
                : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default ExpoCarousel

