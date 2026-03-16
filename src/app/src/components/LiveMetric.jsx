import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * LiveMetric Component - Stock ticker style updates
 * 
 * Animation: BLACK → GRAY (loading) → GREEN/RED (result) → slow fade to BLACK
 */

export function LiveMetric({
  value,
  format = 'number',
  variance = 0.1,
  updateInterval = 15000,
  enableUpdates = true,
  className = '',
  onValueChange = null // Callback when value changes (for syncing)
}) {
  const currentValueRef = useRef(parseFloat(value) || 0)
  const [displayValue, setDisplayValue] = useState(parseFloat(value) || 0)
  const [color, setColor] = useState('black')
  const [slowFade, setSlowFade] = useState(false) // Controls transition speed
  
  useEffect(() => {
    const newVal = parseFloat(value) || 0
    currentValueRef.current = newVal
    setDisplayValue(newVal)
  }, [value])

  const formatValue = useCallback((val) => {
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`
      case 'currency':
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
        return `$${val.toFixed(0)}`
      case 'integer':
        return Math.round(val).toLocaleString()
      default:
        return val.toFixed(1)
    }
  }, [format])

  useEffect(() => {
    if (!enableUpdates) return

    let timeoutId = null
    let animationFrameId = null
    let isMounted = true

    const runCycle = () => {
      const interval = updateInterval * (0.7 + Math.random() * 0.6)
      
      timeoutId = setTimeout(() => {
        if (!isMounted) return
        
        // Step 1: Fast transition, go gray
        setSlowFade(false)
        setColor('gray')
        
        timeoutId = setTimeout(() => {
          if (!isMounted) return
          
          // Step 2: Calculate new value
          const direction = Math.random() > 0.5 ? 1 : -1
          const change = direction * variance * (0.1 + Math.random() * 0.4)
          const oldValue = currentValueRef.current
          const newValue = Math.max(0, oldValue + change)
          currentValueRef.current = newValue
          
          // Report value change for syncing
          if (onValueChange) {
            onValueChange(newValue)
          }
          
          // Step 3: Flash green or red (fast transition)
          setColor(change >= 0 ? 'green' : 'red')
          
          // Animate number
          const startValue = oldValue
          const endValue = newValue
          const duration = 200
          const startTime = performance.now()
          
          const animateNumber = (currentTime) => {
            if (!isMounted) return
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayValue(startValue + (endValue - startValue) * eased)
            if (progress < 1) {
              animationFrameId = requestAnimationFrame(animateNumber)
            }
          }
          animationFrameId = requestAnimationFrame(animateNumber)
          
          // Step 4: After holding green/red, enable slow fade FIRST
          timeoutId = setTimeout(() => {
            if (!isMounted) return
            
            // Enable slow transition BEFORE changing color
            setSlowFade(true)
            
            // Small delay to ensure transition is applied, then change to black
            timeoutId = setTimeout(() => {
              if (!isMounted) return
              setColor('black')
              
              // Wait for slow fade to complete, then start next cycle
              timeoutId = setTimeout(() => {
                if (!isMounted) return
                runCycle()
              }, 3000)
            }, 20) // Small delay for browser to apply new transition
            
          }, 500) // Hold green/red for 500ms before starting fade
          
        }, 250) // Gray duration
        
      }, interval)
    }

    runCycle()

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [enableUpdates, updateInterval, variance, onValueChange])

  const colorValues = {
    black: '#111827',
    gray: '#9ca3af',
    green: '#16a34a',
    red: '#dc2626'
  }

  return (
    <span 
      className={cn('font-bold tabular-nums', className)}
      style={{
        color: colorValues[color],
        transition: `color ${slowFade ? 3000 : 150}ms ease-out`
      }}
    >
      {formatValue(displayValue)}
    </span>
  )
}

export default LiveMetric
