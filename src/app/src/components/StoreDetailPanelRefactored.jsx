import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
// Tooltip removed - using simple HTML title attributes for now
import ChatInterfaceRefactored from './ChatInterfaceRefactored'
import { 
  X,
  MapPin,
  Phone,
  User,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Package,
  Calendar,
  ArrowRight,
  Brain,
  Target,
  Shield,
  Calculator,
  PlayCircle,
  MessageCircle,
  Truck,
  BarChart3,
  Activity,
  Zap,
  ArrowUpRight
} from 'lucide-react'

// Helper to clean store IDs - removes prefixes like "nationwide_" and formats nicely
const formatStoreId = (id) => {
  if (!id) return 'Unknown'
  const idStr = String(id)
  // Remove common prefixes
  const cleaned = idStr.replace(/^(nationwide_|east_coast_|west_coast_|central_|south_|northeast_|france_nationwide_|france_ile_de_france_|france_nord_|france_sud_|france_ouest_|france_est_)/i, '')
  return cleaned
}

/**
 * Refactored Store Detail Panel - Professional Business Intelligence Interface
 * 
 * Features:
 * - 3 focused tabs aligned with demo story flow
 * - Professional retail terminology with comprehensive tooltips
 * - Professional business language (no crisis terminology)
 * - Integrated AI Assistant
 * - Real-time inventory metrics with color coding
 */
export function StoreDetailPanelRefactored({ 
  store,
  isOpen,
  onClose,
  demoId,
  demoConfig = null,
  className = ""
}) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isChatOpen, setIsChatOpen] = useState(false)

  if (!store || !isOpen) return null

  // Extract categories from demo metrics (type='additional')
  const demoCategories = demoConfig?.metrics
    ?.filter(m => m.metric_type === 'additional')
    .map(cat => {
      // Parse extended metadata from description JSON
      let meta = {};
      try {
        meta = cat.description ? JSON.parse(cat.description) : {};
      } catch (e) {
        console.warn('Failed to parse category metadata:', e);
      }
      
      return {
        id: cat.name,
        displayName: cat.display_name,
        dosTarget: meta.dosTarget || meta.dos_target || 60,
        performanceTarget: meta.performanceTarget || meta.performance_target || 90,
        priority: meta.priority || 'medium',
        seasonality: meta.seasonality || 'medium'
      };
    }) || [];

  // Fallback to generic categories if none configured
  const categories = demoCategories.length > 0 ? demoCategories : [
    { id: 'category_1', displayName: 'Category 1', dosTarget: 60, performanceTarget: 90 },
    { id: 'category_2', displayName: 'Category 2', dosTarget: 45, performanceTarget: 88 },
    { id: 'category_3', displayName: 'Category 3', dosTarget: 75, performanceTarget: 92 },
    { id: 'category_4', displayName: 'Category 4', dosTarget: 90, performanceTarget: 85 },
    { id: 'category_5', displayName: 'Category 5', dosTarget: 30, performanceTarget: 95 }
  ];

  console.log('📦 StoreDetailPanel Debug:', {
    storeId: store.id,
    hasDemoConfig: !!demoConfig,
    demoMetrics: demoConfig?.metrics?.length || 0,
    categoriesExtracted: demoCategories.length,
    categoriesUsing: categories.length,
    categories: categories.map(c => c.displayName)
  });

  // Use real performance data from enhanced store directory
  const performanceScore = store.performance_score || store.healthScore || 85;
  const dosScore = store.dos_score || 45;

  // Color coding functions for retail metrics
  const getDOSColor = (dos) => {
    if (dos >= 60) return 'text-green-600'
    if (dos >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceColor = (performance) => {
    if (performance >= 85) return 'text-green-600'
    if (performance >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDOSBg = (dos) => {
    if (dos >= 60) return 'bg-green-50 border-green-200'
    if (dos >= 30) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const getPerformanceBg = (performance) => {
    if (performance >= 85) return 'bg-green-50 border-green-200'
    if (performance >= 75) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  // Seeded random function for consistent per-store, per-category variation
  const seededRandom = (seed) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x); // Returns 0-1
  };

  // Generate dynamic category breakdown based on demo config
  const generateCategoryData = (categories, basePerformance, baseDOS) => {
    const breakdown = {};
    
    // Extract numeric portion of store ID once
    const storeIdStr = String(store.id || '');
    const storeIdNum = parseInt(storeIdStr.replace(/[^\d]/g, '')) || 1;
    
    categories.forEach((cat, index) => {
      // Create unique seed for each category using prime multipliers
      const perfSeed = storeIdNum * 127 + index * 31;
      const dosSeed = storeIdNum * 131 + index * 37 + 500;
      
      // Generate variation: -0.5 to +0.5, then scale
      const performanceVariation = (seededRandom(perfSeed) - 0.5) * 20; // ±10%
      const dosVariation = (seededRandom(dosSeed) - 0.5) * 30; // ±15 days
      
      const catPerformance = Math.max(60, Math.min(100, basePerformance + performanceVariation));
      const catDOS = Math.max(10, Math.min(120, baseDOS + dosVariation));
      
      // Determine status based on targets
      let status = 'optimal';
      if (catPerformance < cat.performanceTarget - 5 || catDOS < cat.dosTarget * 0.7) {
        status = 'critical';
      } else if (catPerformance < cat.performanceTarget || catDOS < cat.dosTarget * 0.85) {
        status = 'attention';
      }
      
      breakdown[cat.displayName] = {
        dos: parseFloat(catDOS.toFixed(1)),
        performance: parseFloat(catPerformance.toFixed(1)),
        status: status,
        ioh: Math.floor(catDOS * (10 + index * 2)), // Inventory on hand
        target_dos: cat.dosTarget,
        target_performance: cat.performanceTarget,
        priority: cat.priority
      };
    });
    
    return breakdown;
  };

  // Enhanced store data with DYNAMIC categories
  const categoryBreakdown = generateCategoryData(categories, performanceScore, dosScore);

  // Determine country from demoConfig
  const isFrance = demoConfig?.country === 'FR' || demoConfig?.footprint_type?.startsWith('france_')
  const currencySymbol = isFrance ? '€' : '$'

  const storeDetails = {
    manager: 'Store Manager',
    phone: store.phone || (isFrance ? '+33 1 23 45 67 89' : '(555) 123-4567'),
    address: store.address || (isFrance ? `${store.city} (${store.state || store.region || ''})` : `${store.city}, ${store.state}`),
    
    // DYNAMIC category breakdown
    dosBreakdown: categoryBreakdown,
    
    // AI-powered optimization recommendations (top 2 underperforming categories)
    optimizationRecommendations: {
      immediate: Object.entries(categoryBreakdown)
        .filter(([_, data]) => data.status !== 'optimal')
        .sort((a, b) => {
          const priorityOrder = { critical: 0, attention: 1, optimal: 2 };
          return priorityOrder[a[1].status] - priorityOrder[b[1].status];
        })
        .slice(0, 2)
        .map(([catName, data], idx) => {
          // Analyze the actual gaps - could be positive or negative
          const dosGap = data.target_dos - data.dos; // positive = need more DOS, negative = overstocked
          const perfGap = Math.max(0, data.target_performance - data.performance); // only care if below target
          const isDosLow = data.dos < data.target_dos * 0.85; // DOS significantly below target
          const isDosHigh = data.dos > data.target_dos * 1.2; // DOS significantly above target (overstock)
          const isPerfLow = data.performance < data.target_performance;
          
          // Calculate realistic costs and impacts
          const baseUnits = Math.abs(Math.round(dosGap * (6 + idx * 2))); // Units involved
          const costPerUnit = 15 + (idx * 8); // $15-$31 per unit depending on category
          const implementationCost = isDosLow ? Math.round(baseUnits * costPerUnit) : Math.round(baseUnits * costPerUnit * 0.3); // Restock costs more than optimization
          const gpLift = Math.round(perfGap * 180 + (isDosLow ? Math.abs(dosGap) * 45 : 0)); // $180/perf point + $45/DOS day recovered
          
          // Generate contextual action based on actual problem
          let action;
          let dosImpactText;
          
          if (isDosLow && data.status === 'critical') {
            action = `Emergency replenishment: Add ${baseUnits} units to reach ${data.target_dos}-day coverage`;
            dosImpactText = `${data.dos.toFixed(0)} → ${data.target_dos} days`;
          } else if (isDosLow) {
            action = `Increase safety stock by ${Math.abs(Math.round(dosGap))} days to meet ${data.target_dos}-day target`;
            dosImpactText = `${data.dos.toFixed(0)} → ${data.target_dos} days`;
          } else if (isDosHigh) {
            action = `Reduce overstock: Redistribute ${baseUnits} units to underperforming locations`;
            dosImpactText = `${data.dos.toFixed(0)} → ${data.target_dos} days (optimize)`;
          } else if (isPerfLow) {
            action = `Improve execution: Focus on ${perfGap.toFixed(1)}% performance gap through merchandising`;
            dosImpactText = `${data.dos.toFixed(0)} days (maintain)`;
          } else {
            action = `Fine-tune replenishment timing for incremental gains`;
            dosImpactText = `${data.dos.toFixed(0)} days (stable)`;
          }
          
          // Calculate ROI with sensible bounds (cap at 500%)
          const roi = implementationCost > 100 
            ? Math.min(500, Math.round((gpLift / implementationCost) * 100)) 
            : (gpLift > 0 ? 'High' : 'N/A');
          
          return {
            item: catName,
            action: action,
            dosImpact: dosImpactText,
            cost: implementationCost > 500 ? `$${(implementationCost / 1000).toFixed(1)}K` : `$${implementationCost}`,
            gpValidation: gpLift > 0 ? `+$${gpLift >= 1000 ? (gpLift / 1000).toFixed(1) + 'K' : gpLift}/yr` : 'Maintain',
            roi: typeof roi === 'number' ? `${roi}%` : roi,
            priority: data.status === 'critical' ? 'high' : 'medium'
          };
        })
    },
    
    // Performance factors (generic retail)
    performanceFactors: {
      inventory: { 
        current: Math.round(performanceScore), 
        target: 90, 
        insight: `Performance at ${Math.round(performanceScore)}% - ${performanceScore >= 90 ? 'exceeding target' : 'below target, optimization recommended'}` 
      },
      supply_chain: { 
        current: Math.round(dosScore), 
        target: 60, 
        insight: `Average DOS at ${Math.round(dosScore)} days - ${dosScore >= 60 ? 'optimal inventory levels' : 'replenishment recommended'}` 
      }
    },
    
    // Financial impact (calculated based on category gaps and performance)
    financials: (() => {
      // Calculate total opportunity from underperforming categories
      const categoryOpportunities = Object.values(categoryBreakdown)
        .filter(cat => cat.status !== 'optimal')
        .map(cat => {
          const dosGap = cat.target_dos - cat.dos; // Can be positive (understocked) or negative (overstocked)
          const perfGap = Math.max(0, cat.target_performance - cat.performance);
          const isDosLow = cat.dos < cat.target_dos * 0.85;
          
          return {
            // Only count lost sales if actually understocked
            lostSales: isDosLow ? Math.round(Math.abs(dosGap) * 45) : 0, // $45/day per DOS gap
            perfImpact: Math.round(perfGap * 180), // $180 per performance point gap
            overstock: !isDosLow && dosGap < -5 ? Math.round(Math.abs(dosGap) * 25) : 0 // Carrying cost
          };
        });
      
      const totalLostSales = categoryOpportunities.reduce((sum, c) => sum + c.lostSales, 0);
      const totalPerfImpact = categoryOpportunities.reduce((sum, c) => sum + c.perfImpact, 0);
      const totalOverstock = categoryOpportunities.reduce((sum, c) => sum + c.overstock, 0);
      const criticalCategories = Object.values(categoryBreakdown).filter(c => c.status === 'critical').length;
      const attentionCategories = Object.values(categoryBreakdown).filter(c => c.status === 'attention').length;
      
      // Base opportunity is sum of all gaps, scaled reasonably
      const baseOpportunity = totalLostSales + totalPerfImpact + totalOverstock;
      
      return {
        gpSavings: Math.round(baseOpportunity * 0.6), // 60% of opportunity is recoverable
        customerRetention: Math.max(50, Math.round(120 - criticalCategories * 15 - attentionCategories * 5)), // Customers at risk
        annualSavingsProjection: Math.round(baseOpportunity * 1.1), // Annual opportunity with compounding
        stockoutRisk: criticalCategories > 2 ? 'High' : criticalCategories > 0 ? 'Medium' : 'Low',
        priorityLevel: criticalCategories > 2 ? 'Urgent' : criticalCategories > 0 ? 'Attention' : 'Maintenance'
      };
    })()
  }

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 z-[9999] w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "translate-x-full",
      className
    )}>
      <div className="h-full flex flex-col">
        {/* Header with Store Metrics Dashboard */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Store #{formatStoreId(store.id)} - {store.city}, {store.state}
                </h2>
                <p className="text-sm text-gray-600">{storeDetails.address}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Key Performance Indicators with Authentic Performance Metrics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {/* Store Performance Metric (Primary) */}
            <div className={cn("text-center p-4 rounded-lg border", getPerformanceBg(performanceScore))}>
              <div className="space-y-1">
                <div className={cn("text-2xl font-bold", getPerformanceColor(performanceScore))}>
                  {performanceScore.toFixed(1)}%
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Store Performance
                </div>
              </div>
              <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-200/50">
                {performanceScore < 92 ? (
                  <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                ) : performanceScore < 93 ? (
                  <AlertTriangle className="h-3 w-3 text-yellow-500 mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                )}
                <span className={cn("text-xs font-medium", 
                  performanceScore < 92 ? "text-red-500" : 
                  performanceScore < 93 ? "text-yellow-600" : "text-green-500")}>
                  {performanceScore < 92 ? 'Action Required' : 
                   performanceScore < 93 ? 'Acceptable' : 'Target Range'}
                </span>
              </div>
            </div>

            {/* DOS Metric */}
            <div className={cn("text-center p-4 rounded-lg border", getDOSBg(dosScore))}>
              <div className="space-y-1">
                <div className={cn("text-2xl font-bold", getDOSColor(dosScore))}>
                  {dosScore.toFixed(1)}
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide" title="Days of Supply - Number of days current inventory will last">
                  DOS (Days)
                </div>
              </div>
              <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-200/50">
                {dosScore < 18 ? (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                ) : dosScore < 25 ? (
                  <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                )}
                <span className={cn("text-xs font-medium", 
                  dosScore < 18 ? "text-red-500" : 
                  dosScore < 25 ? "text-yellow-600" : "text-green-500")}>
                  {dosScore < 18 ? 'Critical' : 
                   dosScore < 25 ? 'Below Target' : 'Target Range'}
                </span>
              </div>
            </div>

            {/* OOS Items */}
            <div className="text-center p-4 rounded-lg border border-orange-200 bg-orange-50">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(247 * (100 - performanceScore) / 100)}
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide" title="Out of Stock - Items currently unavailable in store">
                  OOS Items
                </div>
              </div>
              <div className="flex items-center justify-center mt-2 pt-2 border-t border-orange-200/50">
                <Package className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-xs font-medium text-orange-600">
                  By Category
                </span>
              </div>
            </div>

            {/* IOH Variance */}
            <div className="text-center p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {currencySymbol}{Math.round(245)}K
                </div>
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide" title="Inventory on Hand - Current physical inventory dollar value">
                  IOH Value
                </div>
              </div>
              <div className="flex items-center justify-center mt-2 pt-2 border-t border-blue-200/50">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-xs font-medium text-red-600">
                  -{currencySymbol}12K vs LW
                </span>
              </div>
            </div>
          </div>

          {/* Manager Info & Status */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium">{storeDetails.manager}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-600">{storeDetails.phone}</span>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-sm px-3 py-1",
                performanceScore < 85 
                  ? "bg-orange-50 text-orange-700 border-orange-200" 
                  : "bg-green-50 text-green-700 border-green-200"
              )}
            >
              {performanceScore < 85 ? 'ATTENTION NEEDED' : 'OPTIMAL PERFORMANCE'}
            </Badge>
          </div>
        </div>

        {/* 3-Tab Structure: Professional Business Intelligence */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="overview">Store Performance Overview</TabsTrigger>
              <TabsTrigger value="intelligence">Inventory Intelligence</TabsTrigger>
              <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              
              {/* Tab 1: Store Performance Overview - Story Hook */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                

                {/* Performance Factors Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                      Key Performance Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(storeDetails.performanceFactors).map(([key, factor]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{key.replace('_', ' ')}:</span>
                          <span className={cn(
                            "text-sm font-bold",
                            factor.current >= factor.target ? 'text-green-600' : 'text-orange-600'
                          )}>
                            {factor.current}%
                            <span className="text-gray-500 ml-1">(Target: {factor.target}%)</span>
                          </span>
                        </div>
                        <Progress 
                          value={Math.min((factor.current / factor.target) * 100, 100)} 
                          className="h-2"
                        />
                        <p className="text-xs text-gray-600">{factor.insight}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI Insight Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-purple-600" />
                      AI Performance Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900">
                        <strong>Primary Opportunity:</strong> {performanceScore < 85 
                          ? `Store performance at ${performanceScore.toFixed(1)}% indicates optimization opportunity. Improving inventory management for ${Object.values(storeDetails.dosBreakdown).filter(item => item.status !== 'optimal').length} categories could improve customer satisfaction and reduce stockout risk by 67%.`
                          : `Store performing above target at ${performanceScore.toFixed(1)}%. Current DOS levels support sustained performance with minimal intervention required.`
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Inventory Intelligence - Technical Depth */}
              <TabsContent value="intelligence" className="mt-0 space-y-4">
                
                {/* DOS Analysis by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Package className="h-5 w-5 mr-2 text-green-600" />
                      <span title="Days of Supply - Inventory levels by product category">
                        DOS & Performance Analysis by Category
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(storeDetails.dosBreakdown).map(([category, data]) => (
                      <div key={category} className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-blue-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{category}</h4>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            data.status === 'optimal' ? 'bg-green-50 text-green-700 border-green-200' :
                            data.status === 'attention' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          )}>
                            {data.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-gray-600 block">DOS:</span>
                            <div className={cn("font-bold", getDOSColor(data.dos))}>
                              {data.dos.toFixed(1)} days
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-600 block">Performance:</span>
                            <div className={cn("font-bold", getPerformanceColor(data.performance))}>
                              {data.performance.toFixed(1)}%
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-600 block" title="Inventory on Hand - Current inventory units">IOH:</span>
                            <div className="font-bold text-purple-600">{data.ioh} units</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-600 block">Target DOS:</span>
                            <div className="font-bold text-blue-600">{data.target_dos} days</div>
                          </div>
                        </div>
                        
                        <Progress 
                          value={Math.min((data.dos / 60) * 100, 100)} 
                          className="h-2 mt-3"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Target: 60+ days DOS, 85%+ performance for optimal results
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </TabsContent>

              {/* Tab 3: AI Recommendations - Action & Vision */}
              <TabsContent value="recommendations" className="mt-0 space-y-4">
                
                {/* Transfer Protocol Assistant - Primary Feature */}
                <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-green-900">
                      <MessageCircle className="h-5 w-5 mr-2 text-green-600" />
                      Store Intelligence Agent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800 mb-3">
                        <strong>AI Assistant Ready:</strong> Get comprehensive insights about this specific store's 
                        performance, inventory, customer patterns, and improvement opportunities. Ask about any aspect of store operations.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                        <div>
                          <span className="text-gray-600">Current Context:</span>
                          <div className="font-medium">Store #{formatStoreId(store.id)} - {store.city}, {store.state}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <div className={cn(
                            "font-medium",
                            performanceScore < 85 ? "text-orange-600" : "text-green-600"
                          )}>
                            {performanceScore < 85 ? 'Attention Needed' : 'Optimal Performance'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setIsChatOpen(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Open Store Intelligence Agent
                    </Button>
                  </CardContent>
                </Card>

                {/* AI-Powered Transfer Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-purple-600" />
                      AI Optimization Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {storeDetails.optimizationRecommendations.immediate.map((rec, index) => (
                        <div key={index} className={cn(
                          "border rounded-lg p-4 bg-gradient-to-r",
                          rec.priority === 'high' ? "from-red-50 to-orange-50 border-red-200" : "from-blue-50 to-indigo-50 border-blue-200"
                        )}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900 flex items-center">
                                {rec.priority === 'high' && <Zap className="h-4 w-4 mr-1 text-red-500" />}
                                {rec.item}
                              </h4>
                              <p className="text-sm text-gray-600">{rec.action}</p>
                            </div>
                            <Badge className={cn(
                              rec.priority === 'high' ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                            )}>
                              {rec.priority === 'high' ? 'URGENT' : 'RECOMMENDED'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3 text-sm">
                            <div className="space-y-1">
                              <span className="text-gray-600 block text-xs" title="Days of Supply Impact">DOS Impact:</span>
                              <div className="font-semibold text-blue-600">{rec.dosImpact}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-gray-600 block text-xs">Est. Cost:</span>
                              <div className="font-semibold text-orange-600">{rec.cost}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-gray-600 block text-xs" title="Gross Profit Impact">GP Impact:</span>
                              <div className="font-semibold text-green-600">{rec.gpValidation}</div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-gray-600 block text-xs" title="Return on Investment">ROI:</span>
                              <div className="font-semibold text-purple-600">{rec.roi}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Impact & ROI */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                      Financial Impact Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Risk Assessment Row */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={cn(
                        "text-center rounded-lg p-3 border",
                        storeDetails.financials.stockoutRisk === 'High' ? 'bg-red-50 border-red-200' :
                        storeDetails.financials.stockoutRisk === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-200'
                      )}>
                        <div className={cn(
                          "text-lg font-bold",
                          storeDetails.financials.stockoutRisk === 'High' ? 'text-red-600' :
                          storeDetails.financials.stockoutRisk === 'Medium' ? 'text-yellow-600' :
                          'text-green-600'
                        )}>
                          {storeDetails.financials.stockoutRisk}
                        </div>
                        <div className="text-sm text-gray-600">Stockout Risk</div>
                      </div>
                      <div className={cn(
                        "text-center rounded-lg p-3 border",
                        storeDetails.financials.priorityLevel === 'Urgent' ? 'bg-red-50 border-red-200' :
                        storeDetails.financials.priorityLevel === 'Attention' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-200'
                      )}>
                        <div className={cn(
                          "text-lg font-bold",
                          storeDetails.financials.priorityLevel === 'Urgent' ? 'text-red-600' :
                          storeDetails.financials.priorityLevel === 'Attention' ? 'text-yellow-600' :
                          'text-green-600'
                        )}>
                          {storeDetails.financials.priorityLevel}
                        </div>
                        <div className="text-sm text-gray-600">Action Priority</div>
                      </div>
                    </div>
                    
                    {/* Financial Metrics Row */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {currencySymbol}{(storeDetails.financials.gpSavings / 1000).toFixed(1)}K
                        </div>
                        <div className="text-sm text-gray-600">Recoverable GP (Annual)</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {storeDetails.financials.customerRetention}
                        </div>
                        <div className="text-sm text-gray-600">Customers at Risk</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2">Total Annual Opportunity</h4>
                      <div className="text-3xl font-bold text-green-700 mb-1">
                        {currencySymbol}{(storeDetails.financials.annualSavingsProjection / 1000).toFixed(1)}K
                      </div>
                      <p className="text-sm text-green-600">
                        Potential value recovery through DOS optimization and performance improvement across {Object.values(storeDetails.dosBreakdown).filter(c => c.status !== 'optimal').length} underperforming categories
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions - Professional Business Interface */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Close Analysis
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={cn(
                  "transition-colors",
                  isChatOpen ? "bg-green-50 border-green-300 text-green-700" : ""
                )}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {isChatOpen ? 'Close' : 'Ask'} Store Intelligence Agent
              </Button>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Target className="h-4 w-4 mr-2" />
              Export Intelligence Report
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transfer Protocol Assistant Chat Interface */}
      {(() => {
        try {
          return (
            <ChatInterfaceRefactored
              storeData={{
                store_id: store.id,
                store_number: formatStoreId(store.id),
                store_name: `Location #${formatStoreId(store.id)}`,
                city: store.city,
                state: store.state,
                dos_status: dosScore.toFixed(1),
                performance_score: performanceScore.toFixed(1),
                attention_needed: performanceScore < 85,
                inventory_data: storeDetails.dosBreakdown,
                categories: categories,
                footprint_type: demoConfig?.footprint_type,
                source_brand: store.source_brand,
                country: store.country
              }}
              demoId={demoId}
              isOpen={isChatOpen}
              onToggle={() => setIsChatOpen(!isChatOpen)}
            />
          );
        } catch (error) {
          console.error('❌ Error rendering ChatInterface:', error);
          return null;
        }
      })()}
    </div>
  )
}
