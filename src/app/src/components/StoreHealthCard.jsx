import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

/**
 * Walgreens Store Health Score Card Component
 * 
 * Specialized card component for displaying store health metrics with traffic light colors
 * and risk indicators specific to Walgreens store operations.
 */
export function WalgreensHealthCard({ 
  title, 
  value, 
  subtitle,
  trend, 
  healthScore,
  riskLevel = 'medium',
  icon: Icon,
  className = "",
  onClick,
  isSelected = false,
  ...props 
}) {
  
  // Determine health status based on score
  const getHealthStatus = (score) => {
    if (score >= 85) return { status: 'healthy', color: 'walgreens-healthy', label: 'Healthy' }
    if (score >= 60) return { status: 'at-risk', color: 'walgreens-at-risk', label: 'At Risk' }
    if (score > 0) return { status: 'critical', color: 'walgreens-critical', label: 'Critical' }
    return { status: 'closed', color: 'walgreens-closed', label: 'Closed' }
  }

  // Get risk level styling
  const getRiskStyling = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-50 text-green-700 border-green-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'high': return 'bg-red-50 text-red-700 border-red-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const health = healthScore ? getHealthStatus(healthScore) : null
  const riskStyling = getRiskStyling(riskLevel)

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-lg cursor-pointer",
        isSelected && "ring-2 ring-offset-2 ring-databricks-blue",
        onClick && "hover:scale-[1.02]",
        // Health status border
        health && `border-l-4 border-l-${health.color}`,
        className
      )} 
      onClick={onClick}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {health && (
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              `bg-${health.color}`
            )}>
              {health.status === 'healthy' && <CheckCircle className="h-4 w-4 text-white" />}
              {health.status === 'at-risk' && <AlertTriangle className="h-4 w-4 text-white" />}
              {health.status === 'critical' && <XCircle className="h-4 w-4 text-white" />}
              {health.status === 'closed' && <XCircle className="h-4 w-4 text-white" />}
            </div>
          )}
          {Icon && !health && (
            <div className="h-8 w-8 rounded-full bg-databricks-blue flex items-center justify-center">
              <Icon className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Main Value */}
          <div className="text-2xl font-bold text-databricks-navy">
            {value}
          </div>

          {/* Health Score Display */}
          {health && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Score:</span>
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "text-lg font-semibold",
                  `text-${health.color}`
                )}>
                  {healthScore}/100
                </span>
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-xs",
                    health.status === 'healthy' && 'bg-green-50 text-green-700 border-green-200',
                    health.status === 'at-risk' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                    health.status === 'critical' && 'bg-red-50 text-red-700 border-red-200',
                    health.status === 'closed' && 'bg-gray-50 text-gray-700 border-gray-200'
                  )}
                >
                  {health.label}
                </Badge>
              </div>
            </div>
          )}

          {/* Risk Level */}
          {riskLevel && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Level:</span>
              <Badge 
                variant="outline"
                className={cn("text-xs capitalize", riskStyling)}
              >
                {riskLevel}
              </Badge>
            </div>
          )}

          {/* Trend Indicator */}
          {trend && (
            <div className="flex items-center space-x-2">
              <Badge 
                variant={trend.direction === 'up' ? 'default' : 'destructive'}
                className={cn(
                  "text-xs flex items-center space-x-1",
                  trend.direction === 'up' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                )}
              >
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.value}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
