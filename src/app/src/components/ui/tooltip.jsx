import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { HelpCircle, Info } from 'lucide-react'

/**
 * Tooltip Component for Walgreens-specific terminology
 * Provides hover and click interactions with detailed explanations
 * Auto-adjusts position to prevent cutoff
 */
export function Tooltip({ 
  children, 
  content, 
  title = null,
  side = "auto", // "auto" will choose best position
  className = "",
  triggerClassName = "",
  showIcon = true,
  iconType = "info" // "info" | "help"
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [actualSide, setActualSide] = useState(side)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  const showTooltip = isVisible || isHovered

  // Calculate tooltip position for portal rendering
  useEffect(() => {
    if (showTooltip && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // Check available space in each direction
      const spaceAbove = rect.top
      const spaceBelow = viewportHeight - rect.bottom
      const spaceLeft = rect.left
      const spaceRight = viewportWidth - rect.right
      
      let newSide = side
      let top = 0
      let left = 0
      
      // Choose position with most space, prioritizing bottom and right
      if (side === "auto") {
        if (spaceBelow >= 100) {
          newSide = "bottom"
        } else if (spaceAbove >= 100) {
          newSide = "top"  
        } else if (spaceRight >= 200) {
          newSide = "right"
        } else {
          newSide = "left"
        }
      } else {
        newSide = side
      }
      
      // Calculate position based on chosen side
      switch (newSide) {
        case "bottom":
          top = rect.bottom + 8
          left = rect.left + rect.width / 2 - 100 // Center tooltip (assuming 200px width)
          break
        case "top":
          top = rect.top - 8 - 80 // Assuming tooltip height ~80px
          left = rect.left + rect.width / 2 - 100
          break
        case "right":
          top = rect.top + rect.height / 2 - 40
          left = rect.right + 8
          break
        case "left":
          top = rect.top + rect.height / 2 - 40
          left = rect.left - 208 // 200px width + 8px margin
          break
      }
      
      // Keep tooltip within viewport bounds
      left = Math.max(8, Math.min(left, viewportWidth - 208))
      top = Math.max(8, Math.min(top, viewportHeight - 88))
      
      setActualSide(newSide)
      setTooltipPosition({ top, left })
    }
  }, [side, showTooltip])

  const IconComponent = iconType === "help" ? HelpCircle : Info

  const tooltipContent = showTooltip && (
    <div
      className={cn(
        "fixed px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg max-w-xs",
        className
      )}
      style={{ 
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        minWidth: '200px',
        zIndex: 10001
      }}
    >
      {title && (
        <div className="font-semibold text-blue-200 mb-1 border-b border-gray-600 pb-1">
          {title}
        </div>
      )}
      <div className="text-gray-100 leading-relaxed">
        {content}
      </div>
    </div>
  )

  return (
    <div className="relative inline-flex items-center">
      <div
        ref={triggerRef}
        className={cn("flex items-center cursor-help", triggerClassName)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
        {showIcon && (
          <IconComponent className="h-4 w-4 ml-1 text-gray-400 hover:text-gray-600 transition-colors" />
        )}
      </div>

      {/* Render tooltip in portal to escape stacking context */}
      {typeof document !== 'undefined' && tooltipContent && 
        createPortal(tooltipContent, document.body)
      }
    </div>
  )
}

/**
 * Specialized Walgreens Terminology Tooltip
 * Pre-configured with Walgreens-specific styling and terminology
 */
export function WalgreensTooltip({ 
  term, 
  definition, 
  example = null,
  threshold = null,
  children,
  side = "auto", // Default to auto positioning
  ...props 
}) {
  const content = (
    <div className="space-y-2">
      <div>{definition}</div>
      {threshold && (
        <div className="text-blue-200 text-xs">
          <strong>Threshold:</strong> {threshold}
        </div>
      )}
      {example && (
        <div className="text-gray-300 text-xs italic">
          <strong>Example:</strong> {example}
        </div>
      )}
    </div>
  )

  return (
    <Tooltip
      title={term}
      content={content}
      side={side}
      className="bg-walgreens-blue border border-blue-600"
      {...props}
    >
      {children}
    </Tooltip>
  )
}

/**
 * Walgreens Terminology Definitions
 * Centralized definitions for consistency across the application
 */
export const WalgreensTerms = {
  DOS: {
    term: "DOS (Days of Supply)",
    definition: "The number of days current inventory will last based on average daily sales. Critical metric for preventing stockouts.",
    threshold: "Target: 20-25 days, Red <18 days, Yellow 18-25 days, Green >25 days",
    example: "DOS 18.5 days means inventory will last 18.5 days at current sales pace"
  },
  SSIS: {
    term: "SSIS (Subscribed Store In-Stock)",
    definition: "Percentage of stores that should carry an item (subscribed stores) that actually have it in stock.",
    threshold: "Target ≥93%, Acceptable 92-93%, Below 92% requires action",
    example: "SSIS 94.1% means 94.1% of subscribed stores have the item in stock"
  },
  AdjustedSSIS: {
    term: "Adjusted SSIS",
    definition: "Refined SSIS metric that removes stock-outs from uncontrollable causes, focusing teams on actionable issues.",
    threshold: "Target: 93-94%, Acceptable: 92-93%, Action required: <92%",
    example: "Adjusted SSIS 92.8% after removing vendor and DC-caused outs"
  },
  IOH: {
    term: "IOH (Inventory on Hand)",
    definition: "Current physical inventory dollar value in the store. Key financial and operational metric.",
    threshold: "Tracked vs. plan and previous week for variance analysis",
    example: "IOH $245K, down $12K vs last week"
  },
  OOS: {
    term: "OOS (Out of Stock)",
    definition: "Items currently unavailable in store, categorized by root cause into Super Buckets for targeted action.",
    threshold: "Total OOS items tracked with breakdown by cause (Planning, Store, Vendor, etc.)",
    example: "247 OOS items: Planning 33%, Store 15%, Vendor 13%"
  },
  SuperBuckets: {
    term: "Super Buckets",
    definition: "7 categories that classify root causes of stock-outs: Item Setup, DSD Unmanaged, Store, Vendor, Distribution, Planning, Uncategorized.",
    threshold: "Each bucket has specific ownership and resolution processes",
    example: "Planning bucket (33% of outs) requires forecast and parameter review"
  },
  OTFR: {
    term: "OTFR (On-Time Fill Rate)",
    definition: "Percentage of ordered items delivered on time and in full. Key vendor and DC performance metric.",
    threshold: "Target varies by source; Vendor OTFR ≤65% triggers vendor bucket classification",
    example: "DC Fill Rate 94.3% over 4-week average"
  },
  VOTFR: {
    term: "VOTFR (Vendor On-Time Fill Rate)",
    definition: "Vendor-specific fill rate calculated as on-time units delivered divided by effective ordered units.",
    threshold: "≤65% VOTFR classifies outs as vendor-caused requiring performance management",
    example: "VOTFR 58% indicates vendor performance issues"
  },
  CoreAssortment: {
    term: "Core Assortment Compliance",
    definition: "Percentage of essential items that should be in every store that are actually in stock.",
    threshold: "Target >95%; tracks missing core items requiring immediate attention",
    example: "96.8% compliance with 38 missing core items"
  },
  ShrinkRate: {
    term: "Shrink Rate",
    definition: "Percentage of inventory lost to theft, damage, or administrative errors over a 4-week period.",
    threshold: "Chain average 1.1%; above 1.4% requires asset protection review",
    example: "Shrink Rate 1.4% is above chain average, indicating theft or process issues"
  },
  GetWellPeriod: {
    term: "Get Well Period",
    definition: "Expected timeline for an out-of-stock item to return to inventory based on replenishment cycle and lead times.",
    threshold: "Calculated using next order date plus lead time to store",
    example: "Get Well Period 5 days means item should be back in stock within 5 days"
  },
  JDA: {
    term: "JDA Planning System",
    definition: "Supply chain planning software that generates order recommendations, safety stock levels, and forecasts.",
    threshold: "System recommendations can be overridden by planners (tracked as user adjustments)",
    example: "JDA recommends 100 units but planner adjusted to 75 units"
  },
  EffectiveSafetyStock: {
    term: "Effective Safety Stock (EFF_SS)",
    definition: "Final safety stock level after applying all business rules, overrides, and constraints.",
    threshold: "Compared to IO (Inventory Optimization) recommendations to identify restrictive overrides",
    example: "EFF_SS 50 units vs IO recommendation of 75 units indicates MAXSS override"
  },
  RWC: {
    term: "RWC (Retail Workbench Center)",
    definition: "Tool used by planners to set inventory parameters including minimum and maximum safety stock overrides.",
    threshold: "MAXSS/MINSS overrides tracked as percentage of days applied",
    example: "RWC MAXSS override active 60% of days, limiting inventory levels"
  }
}
