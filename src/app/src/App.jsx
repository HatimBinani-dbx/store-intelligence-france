import React, { useState, useEffect } from 'react'
import { DollarSign, Users, TrendingUp, Activity } from 'lucide-react'
import { DatabricksCard } from './components/DatabricksCard'
import { DatabricksChart } from './components/DatabricksChart'
import { ImprovedResponsiveLayout } from './components/layout/ImprovedResponsiveLayout'
import { ChatPage } from './pages/ChatPage'
import { CustomerSegmentationPage } from './pages/CustomerSegmentationPage'
import { DemandForecastingPage } from './pages/DemandForecastingPage'
import { WalgreensCommandCenterPageUltraSimple } from './pages/WalgreensCommandCenterPageUltraSimple'

function App() {
  const [currentPage, setCurrentPage] = useState('walgreens')
  const [kpis, setKpis] = useState(null)
  const [trends, setTrends] = useState([])
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
      const fetchData = async () => {
    try {
      const [kpisRes, trendsRes, segmentsRes] = await Promise.all([
        fetch('/api/kpis'),
        fetch('/api/trends'),
        fetch('/api/segments')
      ])

      const kpisData = await kpisRes.json()
      const trendsData = await trendsRes.json()
      const segmentsData = await segmentsRes.json()

      setKpis(kpisData)
      setTrends(trendsData)
      setSegments(segmentsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      // Set some default data for development
      setKpis({
        total_revenue: { value: '$2.4M', trend: { direction: 'up', value: '+12%' } },
        total_customers: { value: '15,234', trend: { direction: 'up', value: '+8%' } },
        avg_order_value: { value: '$156', trend: { direction: 'up', value: '+5%' } },
        conversion_rate: { value: '3.2%', trend: { direction: 'down', value: '-2%' } }
      })
      setTrends([
        { month: 'Jan', revenue: 1200000, customers: 12000 },
        { month: 'Feb', revenue: 1350000, customers: 12500 },
        { month: 'Mar', revenue: 1420000, customers: 13100 },
        { month: 'Apr', revenue: 1580000, customers: 13800 },
        { month: 'May', revenue: 1650000, customers: 14200 },
        { month: 'Jun', revenue: 1720000, customers: 14800 },
        { month: 'Jul', revenue: 1890000, customers: 15200 },
        { month: 'Aug', revenue: 2010000, customers: 15800 },
        { month: 'Sep', revenue: 2180000, customers: 16200 },
        { month: 'Oct', revenue: 2250000, customers: 16800 },
        { month: 'Nov', revenue: 2380000, customers: 17500 },
        { month: 'Dec', revenue: 2400000, customers: 18200 }
      ])
      setSegments([
        { segment: 'Bronze', customers: 8500, revenue: 850000 },
        { segment: 'Silver', customers: 5200, revenue: 1040000 },
        { segment: 'Gold', customers: 1200, revenue: 480000 },
        { segment: 'Platinum', customers: 334, revenue: 267000 }
      ])
    } finally {
      setLoading(false)
    }
  }

    fetchData()
  }, [])

  const handleRefreshData = () => {
    setLoading(true)
    // Add a small delay to show loading state
    setTimeout(() => {
      fetchData()
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const dashboardContent = (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* KPI Grid - Mobile-first responsive */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <DatabricksCard
          title="Total Revenue"
          value={kpis?.total_revenue?.value || '$0'}
          trend={kpis?.total_revenue?.trend}
          icon={DollarSign}
          variant="accent"
          className="min-h-[120px] sm:min-h-[140px]"
        />
        <DatabricksCard
          title="Total Customers"
          value={kpis?.total_customers?.value || '0'}
          trend={kpis?.total_customers?.trend}
          icon={Users}
          variant="success"
          className="min-h-[120px] sm:min-h-[140px]"
        />
        <DatabricksCard
          title="Avg Order Value"
          value={kpis?.avg_order_value?.value || '$0'}
          trend={kpis?.avg_order_value?.trend}
          icon={TrendingUp}
          variant="warning"
          className="min-h-[120px] sm:min-h-[140px]"
        />
        <DatabricksCard
          title="Conversion Rate"
          value={kpis?.conversion_rate?.value || '0%'}
          trend={kpis?.conversion_rate?.trend}
          icon={Activity}
          variant="info"
          className="min-h-[120px] sm:min-h-[140px]"
        />
      </div>

      {/* Main Charts Grid - Stack on mobile */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <DatabricksChart
          type="line"
          data={trends}
          xKey="month"
          yKeys={['revenue', 'customers']}
          title="Revenue & Customer Trends"
          subtitle="Monthly performance over the last 12 months"
          height={320}
          className="min-h-[400px] sm:min-h-[420px]"
        />
        <DatabricksChart
          type="bar"
          data={segments}
          xKey="segment"
          yKeys={['customers']}
          title="Customers by Segment"
          subtitle="Customer distribution across loyalty tiers"
          height={320}
          className="min-h-[400px] sm:min-h-[420px]"
        />
      </div>

      {/* Secondary Grid - Responsive layout */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <DatabricksChart
          type="area"
          data={trends.slice(-6)}
          xKey="month"
          yKeys={['revenue']}
          title="Revenue Trend"
          subtitle="Last 6 months"
          height={240}
          showLegend={false}
          className="sm:col-span-2 lg:col-span-1"
        />
        <DatabricksChart
          type="bar"
          data={segments}
          xKey="segment"
          yKeys={['revenue']}
          title="Revenue by Segment"
          subtitle="Total revenue per tier"
          height={240}
          showLegend={false}
        />
        <DatabricksCard
          title="Data Quality Score"
          value="98.5%"
          description="Real-time data accuracy and completeness"
                      trend={ { direction: 'up', value: '+0.3%' } }
          icon={Activity}
          className="min-h-[200px] sm:min-h-[240px]"
        />
      </div>
    </div>
  )

  const renderPage = () => {
    switch (currentPage) {
      case 'walgreens':
        return <WalgreensCommandCenterPageUltraSimple />
      case 'chat':
        return <ChatPage />
      case 'demand-forecasting':
        return <DemandForecastingPage />
      case 'analytics':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics Page</h2>
            <p className="text-gray-600">Advanced analytics dashboard coming soon...</p>
          </div>
        )
      case 'customers':
        return <CustomerSegmentationPage />
      case 'revenue':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Revenue Page</h2>
            <p className="text-gray-600">Revenue analytics dashboard coming soon...</p>
          </div>
        )
      case 'performance':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Performance Page</h2>
            <p className="text-gray-600">Performance metrics dashboard coming soon...</p>
          </div>
        )
      case 'reports':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports Page</h2>
            <p className="text-gray-600">Reports and exports coming soon...</p>
          </div>
        )
      case 'data-sources':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sources</h2>
            <p className="text-gray-600">Data source management coming soon...</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Application settings coming soon...</p>
          </div>
        )
      default:
        return dashboardContent
    }
  }

  return (
    <div>
      {renderPage()}
    </div>
  )
}

export default App