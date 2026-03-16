import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Database,
  Activity,
  PieChart,
  LineChart,
  Target,
  MapPin
} from 'lucide-react'

/**
 * Centralized Navigation Configuration
 * 
 * Single source of truth for all navigation items across the application.
 * Used by: ResponsiveLayout, Sidebar, MobileNav, and any other navigation components.
 * 
 * @typedef {Object} NavigationItem
 * @property {string} id - Unique identifier for the navigation item
 * @property {string} name - Display name for the navigation item
 * @property {string} href - Route/page identifier (without # prefix)
 * @property {React.Component} icon - Lucide React icon component
 * @property {string|null} badge - Optional badge text/number to display
 * @property {string} description - Optional description for tooltips/accessibility
 * @property {boolean} disabled - Whether the item should be disabled
 * @property {string[]} permissions - Optional array of required permissions
 */

/**
 * Primary Navigation Items
 * Main application sections and features
 */
export const primaryNavigation = [
  {
    id: 'walgreens',
    name: 'Walgreens Command Center',
    href: 'walgreens',
    icon: MapPin,
    badge: '127',
    description: 'Store Health Command Center with real-time monitoring',
    disabled: false
  },
  {
    id: 'overview',
    name: 'Overview',
    href: 'overview',
    icon: BarChart3,
    badge: null,
    description: 'Dashboard overview with key metrics and insights',
    disabled: false
  },
  {
    id: 'demand-forecasting',
    name: 'Demand Forecasting',
    href: 'demand-forecasting',
    icon: LineChart,
    badge: 'AI',
    description: 'AI-driven demand forecasting and inventory optimization',
    disabled: false
  },
  {
    id: 'chat',
    name: 'Chat',
    href: 'chat',
    icon: Activity,
    badge: '2',
    description: 'AI-powered chat interface for data queries',
    disabled: false
  },
  {
    id: 'customers',
    name: 'Customer Segmentation',
    href: 'customers',
    icon: Users,
    badge: '15.2K',
    description: 'Customer segmentation and CLV analysis',
    disabled: false
  },
  {
    id: 'revenue',
    name: 'Revenue',
    href: 'revenue',
    icon: DollarSign,
    badge: null,
    description: 'Revenue analytics and financial metrics',
    disabled: false
  },
  {
    id: 'performance',
    name: 'Performance',
    href: 'performance',
    icon: Target,
    badge: null,
    description: 'Performance metrics and KPI tracking',
    disabled: false
  },
  {
    id: 'reports',
    name: 'My Reports',
    href: 'reports',
    icon: PieChart,
    badge: '3',
    description: 'Generate and manage reports',
    disabled: false
  }
]

/**
 * Secondary Navigation Items
 * Administrative and configuration sections
 */
export const secondaryNavigation = [
  {
    id: 'data-sources',
    name: 'Data Sources',
    href: 'data-sources',
    icon: Database,
    badge: null,
    description: 'Manage data connections and sources',
    disabled: false,
    permissions: ['admin', 'data-admin']
  },
  {
    id: 'settings',
    name: 'MySettings',
    href: 'settings',
    icon: Settings,
    badge: null,
    description: 'Application settings and configuration',
    disabled: false,
    permissions: ['admin']
  }
]

/**
 * All Navigation Items
 * Combined array of all navigation items for easy iteration
 */
export const allNavigation = [...primaryNavigation, ...secondaryNavigation]

/**
 * Navigation Helper Functions
 */

/**
 * Get navigation item by ID
 * @param {string} id - Navigation item ID
 * @returns {NavigationItem|undefined} Navigation item or undefined if not found
 */
export const getNavigationItem = (id) => {
  return allNavigation.find(item => item.id === id)
}

/**
 * Check if navigation item is active
 * @param {string} currentPage - Current page/route
 * @param {string} itemHref - Navigation item href
 * @returns {boolean} Whether the navigation item is active
 */
export const isNavigationItemActive = (currentPage, itemHref) => {
  // Handle both 'overview' and '#overview' formats
  const normalizedCurrent = currentPage?.replace('#', '') || 'overview'
  const normalizedHref = itemHref?.replace('#', '') || 'overview'
  return normalizedCurrent === normalizedHref
}

/**
 * Filter navigation items by permissions
 * @param {NavigationItem[]} items - Navigation items to filter
 * @param {string[]} userPermissions - User's permissions
 * @returns {NavigationItem[]} Filtered navigation items
 */
export const filterNavigationByPermissions = (items, userPermissions = []) => {
  return items.filter(item => {
    if (!item.permissions || item.permissions.length === 0) {
      return true // No permissions required
    }
    return item.permissions.some(permission => userPermissions.includes(permission))
  })
}

/**
 * Get navigation items with badges
 * @returns {NavigationItem[]} Navigation items that have badges
 */
export const getNavigationWithBadges = () => {
  return allNavigation.filter(item => item.badge !== null)
}

/**
 * Navigation Configuration for Different Contexts
 */

/**
 * Mobile Navigation Configuration
 * Optimized for mobile display with touch-friendly sizing
 */
export const mobileNavConfig = {
  primaryNavigation,
  secondaryNavigation,
  showBadges: true,
  showDescriptions: false,
  minTouchTarget: '44px'
}

/**
 * Desktop Sidebar Configuration
 * Full-featured navigation for desktop sidebar
 */
export const desktopSidebarConfig = {
  primaryNavigation,
  secondaryNavigation,
  showBadges: true,
  showDescriptions: true,
  collapsible: true
}

/**
 * Compact Navigation Configuration
 * Minimal navigation for compact layouts
 */
export const compactNavConfig = {
  primaryNavigation: primaryNavigation.filter(item => !item.disabled),
  secondaryNavigation: secondaryNavigation.slice(0, 1), // Only first item
  showBadges: false,
  showDescriptions: false
}