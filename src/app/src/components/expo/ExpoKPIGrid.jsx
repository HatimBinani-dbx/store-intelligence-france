import React from 'react'
import { LiveMetric } from '../LiveMetric'
import { Building2, BarChart3, DollarSign, Package } from 'lucide-react'

/**
 * ExpoKPIGrid - Large 4-column grid of KPI cards for expo display
 * 
 * Light theme version with dark text on white cards.
 */
export function ExpoKPIGrid({ 
  metrics,
  demoConfig,
  storeStats
}) {
  const primaryColor = demoConfig?.primary_color || '#3b82f6'

  const kpis = [
    {
      label: 'Total Stores',
      value: metrics.totalStores,
      format: 'integer',
      icon: Building2,
      valueColor: 'text-gray-900',
      iconColor: 'text-gray-600',
      iconBg: 'bg-gray-100',
      static: true
    },
    {
      label: 'Avg Performance',
      value: metrics.avgPerformance,
      format: 'percent',
      icon: BarChart3,
      valueColor: 'text-emerald-600',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      variance: 0.08,
      updateInterval: 8000
    },
    {
      label: 'OOS Rate',
      value: metrics.oosRate,
      format: 'percent',
      icon: Package,
      valueColor: 'text-amber-600',
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      variance: 0.1,
      updateInterval: 10000
    },
    {
      label: 'Inventory Value',
      value: metrics.inventoryValue,
      format: 'currency',
      icon: DollarSign,
      valueColor: 'text-blue-600',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      variance: 200000,
      updateInterval: 12000
    }
  ]

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <div 
            key={index}
            className="bg-white rounded-xl px-5 py-4 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {kpi.static ? (
                  <div className={`text-3xl font-bold ${kpi.valueColor} tabular-nums`}>
                    {kpi.value.toLocaleString()}
                  </div>
                ) : (
                  <LiveMetric
                    value={kpi.value}
                    format={kpi.format}
                    variance={kpi.variance}
                    updateInterval={kpi.updateInterval}
                    className={`text-3xl font-bold ${kpi.valueColor}`}
                  />
                )}
                <div className="text-gray-500 text-sm font-medium uppercase tracking-wide mt-1">
                  {kpi.label}
                </div>
              </div>
              <div className={`p-2 rounded-lg ${kpi.iconBg} flex-shrink-0`}>
                <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExpoKPIGrid

