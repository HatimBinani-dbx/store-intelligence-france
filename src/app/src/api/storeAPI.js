/**
 * API layer for fetching retail store data from backend server
 * Backend connects to Unity Catalog via SQL Warehouse
 * Supports multi-tenant demos with footprint-based store distribution
 */

// API base URL - same server as frontend (no separate backend needed)
const API_BASE_URL = '/api';

/**
 * Fetch stores from Unity Catalog via backend API
 * @param {Object} filters - Optional filters
 * @param {string} filters.footprintType - Geographic footprint (nationwide, east_coast, etc.)
 * @param {number} filters.storeCount - Number of stores to return (1-9000)
 * @param {string} filters.state - Filter by state
 * @param {string} filters.city - Filter by city
 * @param {string} filters.demoId - Demo ID to get demo-specific configuration
 * @param {Object} filters.bounds - Geographic bounds {north, south, east, west}
 * @returns {Promise<Array>} Array of store objects
 */
export const fetchStores = async (filters = {}) => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters.footprintType) params.append('footprintType', filters.footprintType);
    if (filters.storeCount) params.append('storeCount', filters.storeCount);
    if (filters.state) params.append('state', filters.state);
    if (filters.city) params.append('city', filters.city);
    if (filters.demoId) params.append('demoId', filters.demoId);
    if (filters.bounds) params.append('bounds', JSON.stringify(filters.bounds));
    
    const url = `${API_BASE_URL}/stores${params.toString() ? `?${params.toString()}` : ''}`;
    
    console.log('Fetching stores from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    
    console.log(`✅ Fetched ${result.data.length} stores from Unity Catalog`);
    return result.data;
    
  } catch (error) {
    console.error('❌ Error fetching stores from Unity Catalog:', error);
    console.log('⚠️ Falling back to mock data');
    // Fallback to mock data for development
    return getMockStoreData(filters);
  }
};

// Note: SQL query building removed - all queries now handled by backend API
// Frontend only makes REST calls to /api/stores endpoint

/**
 * Mock data for development (until SQL Warehouse is connected)
 */
const getMockStoreData = (filters) => {
  // Return a subset of your real collected data for testing
  const mockStores = [
    {
      store_id: 'WAG04262',
      store_name: 'Walgreens #4262',
      address: '897 SAXON BLVD',
      city: 'Orange City',
      state: 'FL',
      zip_code: '32763',
      latitude: 28.911743,
      longitude: -81.292926,
      phone: '7755336',
      services: ['Pharmacy', 'Immunizations', 'Photo Services'],
      operational_status: 'Open',
      data_source: 'walgreens_api'
    },
    // Add more mock stores here from your collected data
  ];
  
  return mockStores;
};

/**
 * Fetch store by ID
 * @param {string} storeId - Store identifier
 * @param {string} demoId - Optional demo identifier for multi-tenant
 * @returns {Promise<Object>} Store object
 */
export const fetchStoreById = async (storeId, demoId = null) => {
  const stores = await fetchStores({ demoId });
  return stores.find(store => store.id === storeId);
};

/**
 * Fetch stores by geographic bounds (for map viewport)
 * @param {Object} bounds - Geographic bounds {north, south, east, west}
 * @param {string} demoId - Optional demo identifier
 * @returns {Promise<Array>} Filtered stores within bounds
 */
export const fetchStoresByBounds = async (bounds, demoId = null) => {
  const filters = {
    bounds: {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west
    },
    demoId
  };
  
  return fetchStores(filters);
};

/**
 * Fetch store statistics from Unity Catalog via backend API
 * @param {Object} filters - Optional filters { footprintType, demoId }
 */
export const fetchStoreStatistics = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.footprintType) params.append('footprintType', filters.footprintType);
    if (filters.demoId) params.append('demoId', filters.demoId);
    
    const url = `${API_BASE_URL}/stores/stats${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('Fetching store statistics from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }
    console.log('✅ Fetched store statistics from Unity Catalog');
    return result.data;
  } catch (error) {
    console.error('Error fetching store statistics:', error);
    // Fallback to calculating from stores if backend stats fail
    const stores = await fetchStores();
    return {
      total: stores.length,
      statesCovered: new Set(stores.map(s => s.state)).size,
      avgHealthScore: Math.round(
        stores.reduce((sum, s) => sum + s.healthScore, 0) / stores.length || 0
      ),
      byStatus: {
        healthy: stores.filter(s => s.status === 'healthy').length,
        'at-risk': stores.filter(s => s.status === 'at-risk').length,
        critical: stores.filter(s => s.status === 'critical').length,
        closed: stores.filter(s => s.status === 'closed').length
      },
      byState: stores.reduce((acc, store) => {
        acc[store.state] = (acc[store.state] || 0) + 1;
        return acc;
      }, {}),
      lastUpdated: new Date().toISOString()
    };
  }
};

// Backward compatibility - export with old name
export const fetchWalgreensStores = fetchStores;
