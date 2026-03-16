/**
 * Lakebase Postgres Connection Module
 * 
 * Simple dual-mode pattern based on:
 * https://www.databricks.com/blog/how-use-lakebase-transactional-data-layer-databricks-apps
 * 
 * Deployed (Databricks Apps): Uses PGHOST/PGUSER + OAuth via Service Principal
 * Local Development: Uses connection string from .env with temp OAuth token
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;
let tokenCache = null;
let tokenExpiry = null;

/**
 * Check if running in Databricks Apps (PGHOST is auto-injected)
 */
function isDatabricksApp() {
  return !!(process.env.PGHOST && process.env.PGUSER);
}

/**
 * Fetch OAuth token using Service Principal (Databricks Apps only)
 */
async function fetchOAuthToken() {
  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;
  let host = process.env.DATABRICKS_HOST || 'https://dbc-723b517b-2236.cloud.databricks.com';
  
  // Ensure host has https:// prefix
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `https://${host}`;
  }
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing DATABRICKS_CLIENT_ID or DATABRICKS_CLIENT_SECRET');
  }
  
  const response = await fetch(`${host}/oidc/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'grant_type': 'client_credentials',
      'scope': 'all-apis',
      'client_id': clientId,
      'client_secret': clientSecret
    })
  });
  
  if (!response.ok) {
    throw new Error(`OAuth token fetch failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

/**
 * Get OAuth token with caching
 */
async function getToken() {
  // If token is still valid, return cached version
  if (tokenCache && tokenExpiry && Date.now() < tokenExpiry) {
    return tokenCache;
  }
  
  // Fetch fresh token
  console.log('🔄 Fetching fresh OAuth token...');
  tokenCache = await fetchOAuthToken();
  tokenExpiry = Date.now() + (55 * 60 * 1000); // Cache for 55 minutes
  console.log('✅ OAuth token cached');
  
  return tokenCache;
}

/**
 * Initialize connection pool
 */
async function initializePool() {
  if (pool) {
    return pool;
  }
  
  if (isDatabricksApp()) {
    // DEPLOYED MODE: Use PGHOST/PGUSER (auto-injected by Databricks)
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const database = process.env.PGDATABASE || 'demo_platform';
    
    console.log('🏢 Databricks Apps Mode');
    console.log(`   Host: ${host}`);
    console.log(`   User: ${user}`);
    console.log(`   Database: ${database}`);
    
    // Get initial token
    const token = await getToken();
    
    pool = new Pool({
      host,
      port: 5432,
      database,
      user,
      password: token,
      ssl: { rejectUnauthorized: true },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
  } else {
    // LOCAL DEV MODE: Use connection string from .env
    const connectionString = process.env.LAKEBASE_POSTGRES_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('Missing LAKEBASE_POSTGRES_CONNECTION_STRING for local development');
    }
    
    console.log('💻 Local Development Mode');
    console.log('   Using LAKEBASE_POSTGRES_CONNECTION_STRING from .env');
    
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Pool error:', err);
    
    // If auth error in deployed mode, clear token cache
    const isAuthError = err.message && (
      err.message.includes('authentication') || 
      err.message.includes('authorization') ||
      err.code === '28P01'
    );
    
    if (isDatabricksApp() && isAuthError) {
      console.log('🔄 Clearing token cache due to auth error');
      tokenCache = null;
      tokenExpiry = null;
    }
  });
  
  console.log('✅ Connection pool initialized');
  return pool;
}

/**
 * Execute a query with automatic token refresh on auth errors
 */
async function query(sql, params = []) {
  let client = await initializePool();
  
  try {
    const result = await client.query(sql, params);
    console.log(`✅ Query executed: ${result.rowCount} rows`);
    return result;
    
  } catch (error) {
    // If auth error in deployed mode, refresh token and retry
    const isAuthError = error.message && (
      error.message.includes('authentication') || 
      error.message.includes('authorization') ||
      error.message.includes('Invalid authorization') ||
      error.code === '28P01' // PostgreSQL auth failed code
    );
    
    if (isDatabricksApp() && isAuthError) {
      console.log('🔄 Auth error - refreshing token and retrying...');
      console.log(`   Error: ${error.message}`);
      
      // Clear old pool and token
      await pool.end();
      pool = null;
      tokenCache = null;
      tokenExpiry = null;
      
      // Retry with fresh pool
      client = await initializePool();
      const result = await client.query(sql, params);
      console.log(`✅ Query executed (after token refresh): ${result.rowCount} rows`);
      return result;
    }
    
    console.error('❌ Query error:', error.message);
    throw error;
  }
}

/**
 * Execute transaction
 */
async function transaction(callback) {
  const pool = await initializePool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    console.log('✅ Transaction committed');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test connection
 */
async function testConnection() {
  try {
    const result = await query('SELECT 1 as test, current_user as user', []);
    console.log(`✅ Connection test passed - Connected as: ${result.rows[0].user}`);
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

/**
 * Close pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    tokenCache = null;
    tokenExpiry = null;
    console.log('✅ Pool closed');
  }
}

/**
 * Convenience wrapper
 */
export async function queryLakebasePostgres(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

export {
  query,
  transaction,
  testConnection,
  closePool,
  isDatabricksApp
};

