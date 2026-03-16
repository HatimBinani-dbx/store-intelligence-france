import React from 'react'
import { cn } from '@/lib/utils'

export function DatabricksLogo({ className, size = 'md', variant = 'full' }) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }

  if (variant === 'icon') {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-lg bg-databricks-blue",
        sizes[size],
        className
      )}>
        <span className="text-white font-bold text-sm">D</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <img 
        src="/databricks-logo.svg" 
        alt="Databricks" 
        className={cn(sizes[size])}
      />
      {variant === 'full' && (
        <div>
          <h1 className="text-lg font-semibold text-databricks-navy">retail1</h1>
          <p className="text-xs text-muted-foreground">Analytics Dashboard</p>
        </div>
      )}
      {variant === 'simple' && (
        <span className="text-lg font-semibold text-databricks-navy">retail1</span>
      )}
    </div>
  )
}