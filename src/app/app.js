import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { DBSQLClient } from '@databricks/sql';
import * as demoAPI from './api/demoAPI.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file ONLY in local development (not in Databricks Apps)
const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
if (!isDatabricksApp) {
  console.log('💻 Local development detected - loading .env file');
  // Dynamic import for dotenv
  await import('dotenv/config');
} else {
  console.log('🏢 Databricks Apps environment detected - using injected environment variables');
}

// Unity Catalog Configuration
const CATALOG_NAME = process.env.STORE_INTEL_CATALOG || "ops_dispatch_hb_catalog";
const SCHEMA_NAME = process.env.STORE_INTEL_SCHEMA || "store_intelligence";

const app = express();
// Databricks Apps requirement: Use DATABRICKS_APP_PORT if available
const PORT = process.env.DATABRICKS_APP_PORT || process.env.PORT || 3000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract current authenticated user from Databricks Apps headers
 * Databricks Apps automatically injects user identity headers
 */
function getCurrentUser(req, debug = false) {
  // Debug: Log all headers to find the correct one
  if (debug || process.env.DEBUG_HEADERS) {
    console.log('📋 All request headers:');
    Object.keys(req.headers).forEach(key => {
      if (key.toLowerCase().includes('user') || 
          key.toLowerCase().includes('email') || 
          key.toLowerCase().includes('forwarded') ||
          key.toLowerCase().includes('identity')) {
        console.log(`   ${key}: ${req.headers[key]}`);
      }
    });
  }
  
  // Try multiple header possibilities (order matters!)
  // Prioritize x-forwarded-email over x-forwarded-user (which contains App ID)
  const user = req.headers['x-forwarded-email'] ||           // ✅ Real user email
               req.headers['x-forwarded-preferred-username'] || // ✅ Also user email
               req.headers['x-user-email'] ||
               req.headers['remote-user'] ||
               req.query.userId ||  // Fallback for local dev
               req.headers['x-forwarded-user'] ||  // Last resort (might be App ID)
               'anonymous@databricks.com';
  
  if (debug) {
    console.log(`   → Selected user: ${user}`);
  }
  
  return user;
}

// Databricks SQL Client Configuration with Connection Management
let databricksClient = null;
let databricksConfig = null;
let connectionPool = new Map(); // Pool of active connections
let connectionCounter = 0;

async function initializeDatabricksClient() {
  // Check for Databricks App environment (deployed on Databricks)
  const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
  
  if (isDatabricksApp) {
    console.log('🏢 Detected Databricks App environment');
    
    // Service Principal authentication (Databricks Apps best practice)
    if (process.env.DATABRICKS_CLIENT_ID && process.env.DATABRICKS_CLIENT_SECRET) {
      console.log('🔐 Using Service Principal OAuth authentication');
      console.log('✅ Client ID and Secret automatically injected by Databricks');
      
      databricksConfig = {
        authType: 'databricks-oauth',
        host: process.env.DATABRICKS_HOST,
        path: '/sql/1.0/warehouses/7416ab09572b4762',  // Your warehouse ID
        oauthClientId: process.env.DATABRICKS_CLIENT_ID,
        oauthClientSecret: process.env.DATABRICKS_CLIENT_SECRET,
      };
      
      console.log(`   Host: ${databricksConfig.host}`);
      console.log(`   Warehouse Path: ${databricksConfig.path}`);
    } else {
      console.log('⚠️ Service Principal credentials not found - check app configuration');
      return;
    }
  } else {
    console.log('💻 Development environment detected');
    
    if (process.env.DATABRICKS_TOKEN && process.env.DATABRICKS_SERVER_HOSTNAME) {
      console.log('🔐 Using Personal Access Token authentication');
      
      databricksConfig = {
        authType: 'access-token',
        host: process.env.DATABRICKS_SERVER_HOSTNAME,
        path: process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/7416ab09572b4762',
        token: process.env.DATABRICKS_TOKEN,
      };
      
      console.log(`   Host: ${databricksConfig.host}`);
      console.log(`   Warehouse Path: ${databricksConfig.path}`);
      console.log(`   Token: ${databricksConfig.token ? 'Present ✅' : 'Missing ❌'}`);
    } else {
      console.log('⚠️ Development environment not configured');
      console.log('   Required environment variables:');
      console.log('   - DATABRICKS_SERVER_HOSTNAME');
      console.log('   - DATABRICKS_TOKEN (Personal Access Token)');
    }
  }
  
  if (!databricksConfig) {
    console.log('🔄 Using mock data mode');
    return;
  }

  try {
    databricksClient = new DBSQLClient();
    console.log('✅ Databricks SQL Client initialized with connection pooling');
  } catch (error) {
    console.error('❌ Failed to initialize Databricks SQL Client:', error.message);
    databricksClient = null;
    databricksConfig = null;
  }
}

// Connection manager for better session handling
async function getConnection() {
  if (!databricksClient || !databricksConfig) {
    throw new Error('Databricks client not configured');
  }

  const connectionId = `conn_${++connectionCounter}`;
  
  try {
    console.log(`🔗 Creating new connection: ${connectionId}`);
    const client = await databricksClient.connect(databricksConfig);
    const session = await client.openSession();
    
    const connection = {
      id: connectionId,
      client,
      session,
      createdAt: Date.now(),
      inUse: true
    };
    
    connectionPool.set(connectionId, connection);
    return connection;
  } catch (error) {
    console.error(`❌ Failed to create connection ${connectionId}:`, error.message);
    throw error;
  }
}

async function releaseConnection(connection) {
  if (!connection) return;
  
  try {
    console.log(`🔓 Releasing connection: ${connection.id}`);
    
    if (connection.session) {
      await connection.session.close();
    }
    if (connection.client) {
      await connection.client.close();
    }
    
    connectionPool.delete(connection.id);
  } catch (error) {
    console.warn(`⚠️ Error releasing connection ${connection.id}:`, error.message);
  }
}

// Clean up old connections periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  
  for (const [id, connection] of connectionPool.entries()) {
    if (now - connection.createdAt > maxAge) {
      console.log(`🧹 Cleaning up old connection: ${id}`);
      releaseConnection(connection);
    }
  }
}, 60000); // Check every minute

// Execute SQL query via Databricks SQL Client with connection management and retry logic
async function executeDatabricksQuery(sql, parameters = [], maxRetries = 2) {
  if (!databricksClient || !databricksConfig) {
    throw new Error('Databricks SQL Client not configured');
  }

  let lastError = null;
  
  // Retry logic for session expiration issues
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    let connection = null;
    let queryOperation = null;
    
    try {
      console.log(`🔍 Executing SQL via Databricks SQL Client (attempt ${attempt}): ${sql.replace(/\s+/g, ' ').trim()}`);
      
      // Get a managed connection
      connection = await getConnection();
      
      // Execute the statement using the managed session with timeout
      const executePromise = connection.session.executeStatement(sql);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query execution timeout (10 minutes)')), 10 * 60 * 1000);
      });
      
      queryOperation = await Promise.race([executePromise, timeoutPromise]);
      
      // Fetch all results with timeout
      const fetchPromise = queryOperation.fetchAll();
      const fetchTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Result fetch timeout (5 minutes)')), 5 * 60 * 1000);
      });
      
      const result = await Promise.race([fetchPromise, fetchTimeoutPromise]);
      
      console.log(`✅ Query executed successfully, ${result.length} rows returned (attempt ${attempt})`);
      console.log(`🔍 Response structure:`, {
        hasResult: true,
        hasDataArray: true,
        dataArrayLength: result.length,
        hasManifest: true,
        columnCount: result[0] ? Object.keys(result[0]).length : 0
      });
      
      // Debug: Log the actual column names and first row (only for small results)
      if (result[0] && result.length <= 100) {
        console.log(`🔍 Actual column names:`, Object.keys(result[0]));
        console.log(`🔍 First row raw data:`, JSON.stringify(result[0], null, 2));
      } else if (result[0]) {
        console.log(`🔍 Large dataset - Column names:`, Object.keys(result[0]));
        console.log(`🔍 Sample data:`, {
          store_id: result[0].store_id,
          store_name: result[0].store_name,
          city: result[0].city,
          state: result[0].state
        });
      }
      
      // Return in a format compatible with our existing code
      return {
        data_array: result,
        manifest: {
          schema: {
            columns: result[0] ? Object.keys(result[0]).map(key => ({ name: key })) : []
          }
        },
        row_count: result.length
      };
      
    } catch (error) {
      lastError = error;
      const isSessionError = (error.message && error.message.includes('session was closed or has expired')) ||
                            (error.name && error.name.includes('HiveDriverError')) ||
                            (error.toString && error.toString().includes('session was closed'));
      const isTimeoutError = error.message && error.message.includes('timeout');
      
      console.error(`❌ Databricks SQL Query Error (attempt ${attempt}):`, error.message);
      console.log(`🔍 Error analysis - isSessionError: ${isSessionError}, isTimeoutError: ${isTimeoutError}, canRetry: ${attempt <= maxRetries}`);
      
      // Clean up current connection
      if (queryOperation) {
        try {
          await queryOperation.close();
        } catch (closeError) {
          console.warn('Warning: Failed to close query operation:', closeError.message);
        }
      }
      
      if (connection) {
        await releaseConnection(connection);
      }
      
      // Retry only for session expiration errors, not for SQL syntax errors
      if ((isSessionError || isTimeoutError) && attempt <= maxRetries) {
        console.log(`🔄 Retrying query due to ${isSessionError ? 'session expiration' : 'timeout'} (attempt ${attempt + 1}/${maxRetries + 1})`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Query failed after all retry attempts');
}

// Initialize Databricks SQL Client on startup
initializeDatabricksClient().catch(error => {
  console.error('Failed to initialize Databricks client:', error);
});

// Graceful shutdown - clean up connections
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  
  // Close all active connections
  const connections = Array.from(connectionPool.values());
  if (connections.length > 0) {
    console.log(`🧹 Cleaning up ${connections.length} active connections...`);
    await Promise.all(connections.map(conn => releaseConnection(conn)));
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  
  // Close all active connections
  const connections = Array.from(connectionPool.values());
  if (connections.length > 0) {
    console.log(`🧹 Cleaning up ${connections.length} active connections...`);
    await Promise.all(connections.map(conn => releaseConnection(conn)));
  }
  
  process.exit(0);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://fonts.googleapis.com"
      ],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdn.tailwindcss.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://raw.githubusercontent.com", "https://*.basemaps.cartocdn.com", "https://*.tile.openstreetmap.org"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.basemaps.cartocdn.com", "https://*.tile.openstreetmap.org"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json());
// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to serve legacy public files if needed
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const fs = await import('fs');
  
  // Check volume accessibility
  const volumeChecks = {
    '/Volumes': fs.existsSync('/Volumes'),
    '/Volumes/retail_consumer_goods': fs.existsSync('/Volumes/retail_consumer_goods'),
    '/Volumes/retail_consumer_goods/store_intelligence': fs.existsSync('/Volumes/retail_consumer_goods/store_intelligence'),
    '/Volumes/retail_consumer_goods/store_intelligence/logos': fs.existsSync('/Volumes/retail_consumer_goods/store_intelligence/logos')
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'retail-intelligence-platform',
    environment: process.env.DATABRICKS_APP_PORT ? 'databricks-app' : 'development',
    auth_method: databricksConfig?.authMethod || 'none',
    service_principal: databricksConfig?.servicePrincipal || 'none',
    unity_catalog_connected: !!databricksConfig,
    volume_checks: volumeChecks
  });
});

// KPI endpoints
app.get('/api/kpis', async (req, res) => {
  try {
    // TODO: Replace with actual Databricks data queries
    const kpis = {
      total_revenue: { value: '$2.4M', trend: { direction: 'up', value: '+12%' } },
      total_customers: { value: '15,234', trend: { direction: 'up', value: '+8%' } },
      avg_order_value: { value: '$156', trend: { direction: 'up', value: '+5%' } },
      conversion_rate: { value: '3.2%', trend: { direction: 'down', value: '-2%' } }
    };
    
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});

// ============================================================================
// Demo Management API Endpoints (Lakebase Postgres)
// ============================================================================

// Get current authenticated user
app.get('/api/current-user', (req, res) => {
  // Enable debug to see all headers
  const currentUser = getCurrentUser(req, true);
  console.log(`👤 Current user: ${currentUser}`);
  res.json({ 
    user: currentUser,
    authenticated: currentUser !== 'anonymous@databricks.com'
  });
});

// Get all demos (with optional filtering)
app.get('/api/demos', async (req, res) => {
  try {
    // Get authenticated user from Databricks Apps headers
    const currentUser = getCurrentUser(req);
    const { publicOnly, myDemos } = req.query;
    
    // Only filter by userId when explicitly requesting "my demos"
    const userId = myDemos === 'true' ? currentUser : null;
    
    console.log(`🔍 Fetching demos - userId: ${userId || 'all'}, publicOnly: ${publicOnly}`);
    
    const demos = await demoAPI.getAllDemos(
      userId,
      publicOnly === 'true'
    );
    
    console.log(`✅ Found ${demos.length} demos`);
    res.json(demos);
  } catch (error) {
    console.error('❌ Error fetching demos:', error);
    res.status(500).json({ 
      error: 'Failed to fetch demos',
      message: error.message 
    });
  }
});

// Get specific demo by ID
app.get('/api/demos/:demoId', async (req, res) => {
  try {
    const { demoId } = req.params;
    console.log(`🔍 Fetching demo: ${demoId}`);
    
    const demo = await demoAPI.getDemoById(demoId);
    
    if (!demo) {
      return res.status(404).json({ error: 'Demo not found' });
    }
    
    // Update last accessed timestamp
    await demoAPI.updateDemoAccess(demoId);
    
    console.log(`✅ Demo found: ${demo.demo_name}`);
    res.json(demo);
  } catch (error) {
    console.error('❌ Error fetching demo:', error);
    res.status(500).json({ 
      error: 'Failed to fetch demo',
      message: error.message 
    });
  }
});

// Get demo by slug (URL-friendly)
app.get('/api/demos/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`🔍 Fetching demo by slug: ${slug}`);
    
    const demo = await demoAPI.getDemoBySlug(slug);
    
    if (!demo) {
      return res.status(404).json({ error: 'Demo not found' });
    }
    
    console.log(`✅ Demo found: ${demo.demo_name}`);
    res.json(demo);
  } catch (error) {
    console.error('❌ Error fetching demo:', error);
    res.status(500).json({ 
      error: 'Failed to fetch demo',
      message: error.message 
    });
  }
});

// Get available retailers
app.get('/api/retailers', async (req, res) => {
  try {
    const { ingestedOnly } = req.query;
    console.log(`🔍 Fetching retailers - ingestedOnly: ${ingestedOnly}`);
    
    const retailers = await demoAPI.getRetailers(ingestedOnly === 'true');
    
    console.log(`✅ Found ${retailers.length} retailers`);
    res.json(retailers);
  } catch (error) {
    console.error('❌ Error fetching retailers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch retailers',
      message: error.message 
    });
  }
});

// Track user login
app.post('/api/track-login', async (req, res) => {
  try {
    // Get authenticated user from Databricks Apps headers
    const userId = getCurrentUser(req);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    console.log(`👤 Tracking login for: ${userId}`);
    const user = await demoAPI.trackUserLogin(userId);
    
    console.log(`✅ User tracked - login count: ${user.login_count}`);
    res.json(user);
  } catch (error) {
    console.error('❌ Error tracking login:', error);
    res.status(500).json({ 
      error: 'Failed to track login',
      message: error.message 
    });
  }
});

// Create new demo
app.post('/api/demos', async (req, res) => {
  try {
    const demoData = req.body;
    
    // Validation
    if (!demoData.demo_name) {
      return res.status(400).json({ error: 'demo_name is required' });
    }
    
    console.log(`➕ Creating new demo: ${demoData.demo_name}`);
    
    // Get authenticated user from Databricks Apps headers
    const currentUser = getCurrentUser(req);
    demoData.owner_user_id = currentUser;
    console.log(`   Owner: ${currentUser}`);
    
    const newDemo = await demoAPI.createDemo(demoData);
    
    console.log(`✅ Demo created: ${newDemo.demo_id} (slug: ${newDemo.demo_slug})`);
    res.status(201).json(newDemo);
  } catch (error) {
    console.error('❌ Error creating demo:', error);
    res.status(500).json({ 
      error: 'Failed to create demo',
      message: error.message 
    });
  }
});

// Upload logo for a demo
app.post('/api/demos/:demoId/logo', async (req, res) => {
  const { demoId } = req.params;
  console.log('📤 [LOGO UPLOAD] Starting upload for demo:', demoId);
  console.log('📤 [LOGO UPLOAD] Request headers:', req.headers);
  console.log('📤 [LOGO UPLOAD] Content-Type:', req.get('content-type'));
  
  const { logoUploadMiddleware, saveLogoToVolume, updateDemoLogo, deleteLogoFromVolume, generateLogoFilename } = await import('./api/logoAPI.js');
  
  logoUploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error('❌ [LOGO UPLOAD] Middleware error:', err);
      return res.status(400).json({ 
        success: false,
        error: err.message 
      });
    }
    
    console.log('✅ [LOGO UPLOAD] Middleware passed');
    console.log('📄 [LOGO UPLOAD] File received:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'NO FILE');
    
    try {
      if (!req.file) {
        console.error('❌ [LOGO UPLOAD] No file in request');
        return res.status(400).json({ 
          success: false,
          error: 'No logo file uploaded' 
        });
      }
      
      console.log(`📤 [LOGO UPLOAD] Processing logo for demo: ${demoId}`);
      console.log(`   File: ${req.file.originalname} (${req.file.size} bytes)`);
      
      // Generate unique filename
      const filename = `${demoId}-logo-${Date.now()}${path.extname(req.file.originalname)}`;
      
      // Get old logo path to delete (if exists)
      const oldLogoResult = await demoAPI.getDemoById(demoId);
      const oldLogoPath = oldLogoResult?.logo_path;
      
      // Save file to Unity Catalog Volume
      await saveLogoToVolume(req.file.buffer, filename);
      
      // Update database
      await updateDemoLogo(demoId, filename);
      
      // Delete old logo if exists
      if (oldLogoPath) {
        await deleteLogoFromVolume(oldLogoPath);
      }
      
      console.log(`✅ Logo uploaded successfully: ${filename}`);
      res.json({
        success: true,
        filename,
        url: `/api/logos/${filename}`
      });
      
    } catch (error) {
      console.error('❌ Error uploading logo:', error);
      res.status(500).json({ 
        error: 'Failed to upload logo',
        message: error.message 
      });
    }
  });
});

// Serve logo files using Databricks Files API
app.get('/api/logos/:filename', async (req, res) => {
  try {
    const { getLogoBuffer, logoExists } = await import('./api/logoAPI.js');
    const { filename } = req.params;
    
    console.log(`🖼️  Logo request: ${filename}`);
    
    // Validate filename (prevent directory traversal)
    if (filename.includes('..') || filename.includes('/')) {
      console.error(`❌ Invalid filename: ${filename}`);
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Check if file exists
    const exists = await logoExists(filename);
    if (!exists) {
      console.error(`❌ Logo not found: ${filename}`);
      return res.status(404).json({ 
        error: 'Logo not found',
        filename: filename
      });
    }
    
    console.log(`✅ Logo found, downloading: ${filename}`);
    
    // Get file buffer (from volume or local storage)
    const fileBuffer = await getLogoBuffer(filename);
    
    // Determine content type from extension
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif'
    }[ext] || 'application/octet-stream';
    
    // Send file buffer
    res.set('Content-Type', contentType);
    res.send(fileBuffer);
    console.log(`✅ Logo served: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error serving logo:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to serve logo',
        message: error.message 
      });
    }
  }
});

// ============================================================================
// Store Intelligence API Endpoints (Delta Lake)
// ============================================================================

app.get('/api/stores', async (req, res) => {
  try {
    const { footprintType, storeCount, state, city, demoId, bounds } = req.query;
    console.log(`🔍 Store API request - footprint: ${footprintType}, count: ${storeCount}, state: ${state}, city: ${city}, demoId: ${demoId}`);
    
    if (databricksConfig) {
      // If demoId is provided, fetch demo config to get footprint and count
      let actualFootprint = footprintType;
      let actualLimit = storeCount ? parseInt(storeCount) : 9000;
      
      if (demoId && !footprintType) {
        try {
          const { getDemoById } = await import('./api/demoAPI.js');
          const demo = await getDemoById(demoId);
          if (demo) {
            actualFootprint = demo.footprint_type;
            actualLimit = demo.store_count || 9000;
            console.log(`📋 Using demo config: footprint=${actualFootprint}, count=${actualLimit}`);
          }
        } catch (demoError) {
          console.warn('⚠️ Could not fetch demo config:', demoError.message);
        }
      }

      // Query from new dim_demo_stores table
      let query = `
        SELECT 
          store_id,
          footprint_type,
          latitude,
          longitude,
          city,
          state,
          country,
          address,
          source_brand,
          performance_score,
          dos_score,
          display_order
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.dim_demo_stores
        WHERE 1=1
      `;
      
      // Add footprint filter (required for multi-tenant)
      if (actualFootprint) {
        query += ` AND footprint_type = '${actualFootprint.replace(/'/g, "''")}'`;
      }
      
      // Optional filters
      if (state) {
        query += ` AND state = '${state.replace(/'/g, "''")}'`;
      }
      
      if (city) {
        query += ` AND LOWER(city) LIKE LOWER('%${city.replace(/'/g, "''").toLowerCase()}%')`;
      }
      
      // Geographic bounds filter
      if (bounds) {
        try {
          const boundsObj = JSON.parse(bounds);
          query += ` AND latitude BETWEEN ${boundsObj.south} AND ${boundsObj.north}`;
          query += ` AND longitude BETWEEN ${boundsObj.west} AND ${boundsObj.east}`;
        } catch (e) {
          console.warn('⚠️ Invalid bounds parameter:', e.message);
        }
      }
      
      // Order by display_order for consistent sampling
      query += ` ORDER BY display_order LIMIT ${Math.min(actualLimit, 9000)}`;
      
      try {
        const result = await executeDatabricksQuery(query, []);
        const rows = result.data_array || [];
        
        console.log(`🔍 Retrieved ${rows.length} stores from dim_demo_stores`);
        
        // Transform for frontend (minimal transformation needed)
        const transformedStores = rows.map(row => ({
          id: row.store_id,
          storeId: row.store_id,
          footprintType: row.footprint_type,
          latitude: row.latitude,
          longitude: row.longitude,
          city: row.city,
          state: row.state,
          country: row.country,
          address: row.address,
          sourceBrand: row.source_brand,
          performanceScore: row.performance_score,
          dosScore: row.dos_score,
          displayOrder: row.display_order,
          // Derive health status from performance score
          healthScore: row.performance_score,
          status: row.performance_score >= 90 ? 'healthy' : (row.performance_score >= 85 ? 'at-risk' : 'critical'),
          risk: row.performance_score >= 90 ? 'LOW' : (row.performance_score >= 85 ? 'MEDIUM' : 'HIGH')
        }));
        
        console.log(`✅ Retrieved ${transformedStores.length} stores from Unity Catalog`);
        
        res.json({
          success: true,
          data: transformedStores,
          count: transformedStores.length,
          footprint: actualFootprint,
          timestamp: new Date().toISOString(),
          source: 'unity_catalog_rest',
          query: query.replace(/\n\s*/g, ' ')
        });
        
      } catch (queryError) {
        console.error('❌ Unity Catalog REST query failed:', queryError.message);
        throw queryError;
      }
      
    } else {
      // Fallback to mock data
      console.log('⚠️ Using mock data - Databricks not connected');
      // Select mock store based on footprint type
      const isFranceFootprint = (footprintType || '').startsWith('france_')
      const mockStores = isFranceFootprint ? [
        {
          id: "france_nationwide_00001",
          storeId: "france_nationwide_00001",
          footprintType: footprintType || "france_nationwide",
          city: "Paris",
          state: "Ile-de-France",
          country: "FR",
          address: "15 RUE DE RIVOLI",
          latitude: 48.8566,
          longitude: 2.3522,
          sourceBrand: "carrefour",
          performanceScore: 92.5,
          dosScore: 45,
          categoryScores: {
            category1: 95,
            category2: 90,
            category3: 88,
            category4: 93,
            category5: 91
          },
          performanceTier: "attention",
          displayOrder: 1
        }
      ] : [
        {
          id: "nationwide_00001",
          storeId: "nationwide_00001",
          footprintType: footprintType || "nationwide",
          city: "Orange City",
          state: "FL",
          country: "US",
          address: "897 SAXON BLVD",
          latitude: 28.911743,
          longitude: -81.292926,
          sourceBrand: "walgreens",
          performanceScore: 92.5,
          dosScore: 45,
          categoryScores: {
            category1: 95,
            category2: 90,
            category3: 88,
            category4: 93,
            category5: 91
          },
          performanceTier: "attention",
          displayOrder: 1
        }
      ];
      
      res.json({
        success: true,
        data: mockStores,
        count: mockStores.length,
        footprint: footprintType || "nationwide",
        timestamp: new Date().toISOString(),
        source: 'mock_data',
        note: 'Using sample data - Databricks not connected'
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching stores:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stores',
      message: error.message 
    });
  }
});

app.get('/api/stores/stats', async (req, res) => {
  try {
    const { footprintType, demoId } = req.query;
    
    if (databricksConfig) {
      console.log(`🔍 Fetching store statistics from dim_demo_stores (footprint: ${footprintType})...`);
      
      // Determine actual footprint to query
      let actualFootprint = footprintType;
      if (demoId && !footprintType) {
        try {
          const { getDemoById } = await import('./api/demoAPI.js');
          const demo = await getDemoById(demoId);
          if (demo) {
            actualFootprint = demo.footprint_type || actualFootprint;
          }
        } catch (demoError) {
          console.warn('⚠️ Could not fetch demo config for stats:', demoError.message);
        }
      }
      
      // Build WHERE clause for footprint filter
      const footprintFilter = actualFootprint ? `WHERE footprint_type = '${actualFootprint.replace(/'/g, "''")}'` : '';
      
      const statsQuery = `
        SELECT 
          COUNT(*) as total_stores,
          COUNT(DISTINCT state) as regions_covered,
          ROUND(AVG(performance_score), 2) as avg_performance_score,
          ROUND(AVG(dos_score), 2) as avg_dos_score,
          COUNT(CASE WHEN performance_score >= 90 THEN 1 END) as optimal_stores,
          COUNT(CASE WHEN performance_score >= 85 AND performance_score < 90 THEN 1 END) as attention_stores,
          COUNT(CASE WHEN performance_score < 85 THEN 1 END) as priority_stores
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.dim_demo_stores
        ${footprintFilter}
      `;
      
      const stateQuery = `
        SELECT 
          state,
          COUNT(*) as store_count,
          ROUND(AVG(performance_score), 2) as avg_performance
        FROM ${CATALOG_NAME}.${SCHEMA_NAME}.dim_demo_stores
        ${footprintFilter}
        GROUP BY state
        ORDER BY store_count DESC
        LIMIT 10
      `;
      
      try {
        // Execute stats query
        const statsResult = await executeDatabricksQuery(statsQuery, []);
        const statsRows = statsResult.data_array || [];
        
        // Execute state breakdown query  
        const stateResult = await executeDatabricksQuery(stateQuery, []);
        const stateRows = stateResult.data_array || [];
        
        // Convert stats result to object (manual column mapping)
        const mainStats = {};
        if (statsRows[0]) {
          const statsColumnNames = ['total_stores', 'regions_covered', 'avg_performance_score', 'avg_dos_score', 'optimal_stores', 'attention_stores', 'priority_stores'];
          statsColumnNames.forEach((colName, index) => {
            mainStats[colName] = statsRows[0][index];
          });
        }
        
        // Convert state results to object (manual column mapping)
        const byState = {};
        stateRows.forEach(row => {
          const state = row[0]; // state column
          const count = row[1]; // store_count column
          const avgPerf = row[2]; // avg_performance column
          byState[state] = { 
            count: count,
            avgPerformance: avgPerf
          };
        });
        
        // Calculate real stats from performance scores
        const total = mainStats.total_stores || 0;
        const stats = {
          total: total,
          regionsCovered: mainStats.regions_covered || 0,
          avgHealthScore: mainStats.avg_performance_score || 0,
          avgDosScore: mainStats.avg_dos_score || 0,
          byStatus: {
            healthy: mainStats.optimal_stores || 0,        // ≥90%
            'at-risk': mainStats.attention_stores || 0,    // 85-90%
            critical: mainStats.priority_stores || 0,      // <85%
            closed: 0  // No closed stores in demo data
          },
          byState: byState,
          footprint: actualFootprint,
          lastUpdated: new Date().toISOString()
        };
        
        console.log(`✅ Retrieved statistics for ${stats.total} stores (${stats.byStatus.healthy} optimal, ${stats.byStatus['at-risk']} attention, ${stats.byStatus.critical} priority)`);
        
        res.json({
          success: true,
          data: stats,
          source: 'unity_catalog_rest'
        });
        
      } catch (queryError) {
        console.error('❌ Statistics REST query failed:', queryError.message);
        throw queryError;
      }
      
    } else {
      // Fallback to mock data
      console.log('⚠️ Using mock statistics - Databricks not connected');
      const isFranceStats = (footprintType || '').startsWith('france_')
      const stats = {
        total: 8118,
        regionsCovered: isFranceStats ? 13 : 50,
        avgHealthScore: 78,
        byStatus: {
          healthy: 5683,
          'at-risk': 1624,
          critical: 649,
          closed: 162
        },
        byState: {
          'FL': 750,
          'TX': 650, 
          'CA': 600,
          'IL': 850,
          'NY': 450
        },
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: stats,
        source: 'mock_data'
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching store statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics',
      message: error.message 
    });
  }
});

// Chart data endpoints
app.get('/api/trends', async (req, res) => {
  try {
    // TODO: Replace with actual Databricks data queries
    const trends = [
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
    ];
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

app.get('/api/segments', async (req, res) => {
  try {
    // TODO: Replace with actual Databricks data queries
    const segments = [
      { segment: 'Bronze', customers: 8500, revenue: 850000 },
      { segment: 'Silver', customers: 5200, revenue: 1040000 },
      { segment: 'Gold', customers: 1200, revenue: 480000 },
      { segment: 'Platinum', customers: 334, revenue: 267000 }
    ];
    
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});


// OLTP endpoints for real-time data
app.post('/api/transactions', async (req, res) => {
  try {
    // TODO: Implement Lakebase OLTP integration
    const transaction = {
      id: Date.now().toString(),
      ...req.body,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast real-time update
    // TODO: Implement WebSocket or Server-Sent Events
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.get('/api/transactions/recent', async (req, res) => {
  try {
    // TODO: Replace with actual OLTP queries
    const recentTransactions = [
      { id: '1', customer: 'John Doe', amount: 156.78, product: 'Product A', timestamp: new Date().toISOString() },
      { id: '2', customer: 'Jane Smith', amount: 89.99, product: 'Product B', timestamp: new Date(Date.now() - 300000).toISOString() },
      { id: '3', customer: 'Bob Johnson', amount: 234.50, product: 'Product C', timestamp: new Date(Date.now() - 600000).toISOString() }
    ];
    
    res.json(recentTransactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
});

// Agent API Proxy Endpoint
app.post('/api/agent/chat', async (req, res) => {
  try {
    console.log('🤖 Agent API proxy request received');
    
    const { messages, context } = req.body;
    const demoId = context?.demo_id;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request: messages array required' 
      });
    }

    // Get authentication based on environment
    const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
    let authHeaders = {};
    
    if (isDatabricksApp) {
      // Production: Use Service Principal OAuth
      console.log('🔐 Production environment: Using Service Principal OAuth');
      
      if (!process.env.DATABRICKS_CLIENT_ID || !process.env.DATABRICKS_CLIENT_SECRET) {
        console.error('❌ Missing Service Principal credentials in production');
        return res.status(500).json({ 
          success: false, 
          error: 'Server configuration error: Missing Service Principal credentials',
          details: 'DATABRICKS_CLIENT_ID or DATABRICKS_CLIENT_SECRET not found'
        });
      }
      
      try {
        // Get OAuth token for Model Serving API
        const tokenResponse = await fetch(`https://${process.env.DATABRICKS_HOST}/oidc/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'scope': 'all-apis',
            'client_id': process.env.DATABRICKS_CLIENT_ID,
            'client_secret': process.env.DATABRICKS_CLIENT_SECRET
          })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ OAuth token request failed:', tokenResponse.status, errorText);
          return res.status(500).json({ 
            success: false, 
            error: 'Authentication failed: Could not obtain OAuth token',
            details: `Token request failed with status ${tokenResponse.status}`
          });
        }
        
        const tokenData = await tokenResponse.json();
        authHeaders = {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        };
        
        console.log('✅ OAuth token obtained successfully');
        
      } catch (error) {
        console.error('❌ OAuth token generation failed:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Authentication failed: OAuth token generation error',
          details: error.message
        });
      }
      
    } else {
      // Development: PAT token
      const databricksToken = process.env.DATABRICKS_TOKEN;
      if (!databricksToken) {
        console.error('❌ DATABRICKS_TOKEN not found in environment');
        return res.status(500).json({ 
          success: false, 
          error: 'Server configuration error: Missing PAT token' 
        });
      }
      
      authHeaders = {
        'Authorization': `Bearer ${databricksToken}`,
        'Content-Type': 'application/json'
      };
    }

    // ========================================================================
    // Genie Integration - query store data via AI/BI Genie Space
    // ========================================================================
    const GENIE_SPACE_ID = process.env.GENIE_SPACE_ID || '01f11daa8be21b1388425bb25f53f00d';
    const genieBase = `https://${process.env.DATABRICKS_HOST}/api/2.0/genie/spaces/${GENIE_SPACE_ID}`;
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content;

    if (!lastUserMessage) {
      return res.status(400).json({ success: false, error: 'No user message found' });
    }

    // Enrich the user question with selected store context so Genie can write targeted SQL
    let enrichedMessage = lastUserMessage;
    const storeId = context?.store_id;
    const footprint = context?.footprint_type || context?.footprintType;
    if (storeId || context?.city) {
      const ctxParts = [];
      if (storeId) ctxParts.push(`store_id = '${storeId}'`);
      if (context.city) ctxParts.push(`city = '${context.city}'`);
      if (context.state) ctxParts.push(`state = '${context.state}'`);
      if (context.source_brand) ctxParts.push(`source_brand = '${context.source_brand}'`);
      if (context.performance_score) ctxParts.push(`performance_score = ${context.performance_score}`);
      if (context.dos_status) ctxParts.push(`dos_score = ${context.dos_status}`);
      if (footprint) ctxParts.push(`footprint_type = '${footprint}'`);
      if (context.country) ctxParts.push(`country = '${context.country}'`);

      enrichedMessage = `Context: I am looking at a specific store where ${ctxParts.join(', ')}. When I say "this store" or "this footprint", use these values to filter. ${lastUserMessage}`;
    }

    console.log(`🔮 Genie query: "${enrichedMessage.substring(0, 200)}..."`);

    // Determine if this is a follow-up (existing conversation) or new conversation
    const conversationId = context?.genie_conversation_id;
    let messageResponse;

    if (conversationId) {
      // Follow-up message in existing conversation
      console.log(`🔮 Genie follow-up in conversation: ${conversationId}`);
      const followUpResp = await fetch(`${genieBase}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content: enrichedMessage })
      });
      if (!followUpResp.ok) {
        const errText = await followUpResp.text();
        console.error('❌ Genie follow-up error:', followUpResp.status, errText);
        return res.status(followUpResp.status).json({ success: false, error: `Genie error: ${followUpResp.statusText}`, details: errText });
      }
      messageResponse = await followUpResp.json();
    } else {
      // Start new conversation
      console.log('🔮 Starting new Genie conversation');
      const startResp = await fetch(`${genieBase}/start-conversation`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content: enrichedMessage })
      });
      if (!startResp.ok) {
        const errText = await startResp.text();
        console.error('❌ Genie start error:', startResp.status, errText);
        return res.status(startResp.status).json({ success: false, error: `Genie error: ${startResp.statusText}`, details: errText });
      }
      messageResponse = await startResp.json();
    }

    const genieConvId = messageResponse.conversation_id;
    const genieMsgId = messageResponse.message_id;
    console.log(`🔮 Genie conversation=${genieConvId}, message=${genieMsgId}`);

    // Poll for completion (up to 60 seconds)
    let completedMessage = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollResp = await fetch(
        `${genieBase}/conversations/${genieConvId}/messages/${genieMsgId}`,
        { headers: authHeaders }
      );
      if (!pollResp.ok) continue;
      const pollData = await pollResp.json();
      const status = pollData.status;
      console.log(`🔮 Genie poll ${i + 1}: ${status}`);

      if (status === 'COMPLETED') {
        completedMessage = pollData;
        break;
      }
      if (status === 'FAILED' || status === 'CANCELLED') {
        console.error('❌ Genie query failed:', pollData);
        return res.status(500).json({ success: false, error: 'Genie query failed' });
      }
    }

    if (!completedMessage) {
      return res.status(504).json({ success: false, error: 'Genie query timed out' });
    }

    // Extract response from attachments
    let responseText = '';
    let sqlQuery = null;
    let queryData = null;
    let suggestedQuestions = [];

    for (const att of (completedMessage.attachments || [])) {
      if (att.text?.content) {
        responseText += att.text.content + '\n\n';
      }
      if (att.suggested_questions?.questions) {
        suggestedQuestions = att.suggested_questions.questions;
      }
      if (att.query) {
        sqlQuery = att.query.query;
        // Fetch query result data
        try {
          const qrResp = await fetch(
            `${genieBase}/conversations/${genieConvId}/messages/${genieMsgId}/query-result/${att.attachment_id}`,
            { headers: authHeaders }
          );
          if (qrResp.ok) {
            const qrData = await qrResp.json();
            const columns = qrData.statement_response?.manifest?.schema?.columns?.map(c => c.name) || [];
            const rows = qrData.statement_response?.result?.data_array || [];
            if (columns.length && rows.length) {
              queryData = { columns, rows: rows.slice(0, 50) }; // Cap at 50 rows for display
            }
          }
        } catch (e) {
          console.error('⚠️ Failed to fetch query result:', e.message);
        }
      }
    }

    // Build a rich text response including data table if available
    if (queryData && !responseText.trim()) {
      responseText = `Here are the results:\n\n`;
    }
    if (queryData) {
      // Format as markdown table
      const header = `| ${queryData.columns.join(' | ')} |`;
      const separator = `| ${queryData.columns.map(() => '---').join(' | ')} |`;
      const dataRows = queryData.rows.map(r => `| ${r.join(' | ')} |`).join('\n');
      responseText += `\n\n${header}\n${separator}\n${dataRows}`;
    }

    if (!responseText.trim()) {
      responseText = 'I was unable to generate an answer for that question. Try rephrasing or asking about store performance, geographic distribution, or inventory metrics.';
    }

    console.log(`✅ Genie response: ${responseText.length} chars`);

    // Return in the format the frontend expects (ResponsesAgent-compatible)
    res.json({
      success: true,
      response: {
        output: [{
          type: 'message',
          content: [{ type: 'output_text', text: responseText.trim() }]
        }]
      },
      genie_conversation_id: genieConvId,
      suggested_questions: suggestedQuestions
    });

  } catch (error) {
    console.error('❌ Agent proxy error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to communicate with agent',
      message: error.message 
    });
  }
});

// Agent Health Check Proxy
app.get('/api/agent/health', async (req, res) => {
  try {
    // Check authentication configuration based on environment
    const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
    let authConfigured = false;
    let authMethod = 'none';
    
    if (isDatabricksApp) {
      // Production: Service Principal OAuth
      authConfigured = !!(process.env.DATABRICKS_CLIENT_ID && process.env.DATABRICKS_CLIENT_SECRET);
      authMethod = 'service_principal_oauth';
    } else {
      // Development: PAT token
      authConfigured = !!process.env.DATABRICKS_TOKEN;
      authMethod = 'pat_token';
    }
    
    if (!authConfigured) {
      console.error('❌ Agent health check failed: Missing authentication credentials');
      console.error('Environment:', {
        isDatabricksApp,
        hasClientId: !!process.env.DATABRICKS_CLIENT_ID,
        hasClientSecret: !!process.env.DATABRICKS_CLIENT_SECRET,
        hasPATToken: !!process.env.DATABRICKS_TOKEN
      });
      
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing authentication credentials',
        environment: isDatabricksApp ? 'databricks_app' : 'development',
        authMethod: authMethod,
        details: isDatabricksApp 
          ? 'Missing DATABRICKS_CLIENT_ID or DATABRICKS_CLIENT_SECRET'
          : 'Missing DATABRICKS_TOKEN'
      });
    }

    // Health check passed
    res.json({
      success: true,
      status: 'healthy',
      message: 'Agent proxy is configured and ready',
      endpoint: 'genie-space/' + (process.env.GENIE_SPACE_ID || '01f11daa8be21b1388425bb25f53f00d'),
      environment: isDatabricksApp ? 'databricks_app' : 'development',
      authMethod: authMethod,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Agent health check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed',
      message: error.message 
    });
  }
});

// Transform Unity Catalog data for frontend (using enhanced store directory with SSIS data)
function transformStoreData(row) {
  // Debug: log the first few rows to understand the data structure
  if (Math.random() < 0.001) { // Log ~0.1% of rows to avoid spam with large datasets
    console.log('🔍 Sample row data:', {
      available_columns: Object.keys(row),
      raw_store_id: row.store_id,
      raw_store_name: row.store_name,
      raw_city: row.city,
      raw_state: row.state,
      raw_ssis_performance: row.ssis_performance,
      raw_health_score: row.health_score,
      sample_keys_values: Object.entries(row).slice(0, 8)
    });
  }
  
  // Parse services safely
  const services = Array.isArray(row.services) ? row.services : [];
  
  // Extract values directly from enhanced store directory
  const storeId = row.store_id;
  const storeName = row.store_name;
  const city = row.city;
  const state = row.state;
  const address = row.address;
  const zipCode = row.zip_code;
  const latitude = parseFloat(row.latitude);
  const longitude = parseFloat(row.longitude);
  const phone = row.phone;
  
  // Use SSIS performance data directly from store directory (no random generation!)
  const ssisPerformance = parseFloat(row.ssis_performance) || 85.0;
  const healthScore = parseFloat(row.health_score) || ssisPerformance;
  const performanceTier = row.performance_tier || 'ATTENTION';
  const status = row.status || 'attention';
  const risk = row.risk || 'MEDIUM';
  const hasConstraints = row.has_constraints || false;
  const exemptionStatus = row.exemption_status || 'Unknown';
  const exemptionReason = row.exemption_reason || 'Unknown';
  
  return {
    id: (storeId || '').toString().replace('WAG', ''),
    storeId: storeId || '',
    name: storeName || 'Unknown Store',
    city: city || '',
    state: state || '',
    address: address || '',
    zipCode: zipCode || '',
    latitude: isNaN(latitude) ? null : latitude,
    longitude: isNaN(longitude) ? null : longitude,
    lat: isNaN(latitude) ? null : latitude,  // Duplicate for map compatibility
    lng: isNaN(longitude) ? null : longitude, // Duplicate for map compatibility
    phone: phone || '',
    services: services,
    storeFormat: row.store_format || 'Standard',
    
    // SSIS Performance data from enhanced store directory
    healthScore: Math.round(healthScore),  // Used for map dot colors
    ssisPerformance: Math.round(ssisPerformance), // Explicit SSIS field
    performanceTier: performanceTier,
    status: status,
    risk: risk,
    hasConstraints: hasConstraints,
    exemptionStatus: exemptionStatus,
    exemptionReason: exemptionReason,
    
    // Additional demo metrics
    inStock: Math.round(ssisPerformance), // Map SSIS to in-stock percentage
    scriptFill: parseInt(row.flu_vaccine_ssis) || Math.round(80 + (Math.random() * 20)),
    salesTrend: Math.round((Math.random() - 0.5) * 20),
    
    // Category-specific performance (from enhanced directory)
    fluVaccineDos: parseInt(row.flu_vaccine_dos) || 30,
    fluVaccineSsis: parseInt(row.flu_vaccine_ssis) || 80,
    coldMedicineDos: parseInt(row.cold_medicine_dos) || 25,
    coldMedicineSsis: parseInt(row.cold_medicine_ssis) || 75,
    
    // Metadata
    operationalStatus: row.operational_status || 'Unknown',
    dataSource: row.data_source || 'enhanced_store_directory',
    lastUpdated: new Date().toISOString()
  };
}

// ============================================================================
// LLM PERSONALIZATION ENDPOINTS
// ============================================================================

// Step 1: LLM-Powered Config Personalization
app.post('/api/personalize', async (req, res) => {
  try {
    const { retailerName } = req.body;
    
    if (!retailerName || typeof retailerName !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Retailer name is required' 
      });
    }
    
    console.log(`🤖 Step 1: Personalizing config for: ${retailerName}`);
    
    const { buildPersonalizationPrompt } = await import('./lib/personalizationPrompt.js');
    const prompt = buildPersonalizationPrompt(retailerName);
    
    // Call Databricks LLM
    // Use DATABRICKS_LLM_ENDPOINT if set, otherwise construct from DATABRICKS_HOST
    const llmEndpoint = process.env.DATABRICKS_LLM_ENDPOINT || 
      `https://${process.env.DATABRICKS_HOST}/serving-endpoints/databricks-gpt-5-mini/invocations`;
    
    if (!process.env.DATABRICKS_HOST && !process.env.DATABRICKS_LLM_ENDPOINT) {
      console.error('❌ Missing DATABRICKS_HOST or DATABRICKS_LLM_ENDPOINT');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing Databricks host configuration' 
      });
    }
    
    console.log(`🔗 Using LLM endpoint: ${llmEndpoint}`);
    
    // Get auth token (same logic as chat endpoint)
    const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
    let authHeaders;
    
    if (isDatabricksApp) {
      try {
        console.log('🔐 Generating OAuth token for LLM call...');
        const tokenEndpoint = `https://${process.env.DATABRICKS_HOST}/oidc/v1/token`;
        
        const tokenResponse = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'scope': 'all-apis',
            'client_id': process.env.DATABRICKS_CLIENT_ID,
            'client_secret': process.env.DATABRICKS_CLIENT_SECRET
          })
        });
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ OAuth token request failed:', tokenResponse.status, errorText);
          return res.status(500).json({ 
            success: false, 
            error: 'Authentication failed: Could not obtain OAuth token'
          });
        }
        
        const tokenData = await tokenResponse.json();
        authHeaders = {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        };
        
      } catch (error) {
        console.error('❌ OAuth token generation failed:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Authentication failed: OAuth token generation error',
          details: error.message
        });
      }
    } else {
      const databricksToken = process.env.DATABRICKS_TOKEN;
      if (!databricksToken) {
        console.error('❌ DATABRICKS_TOKEN not found in environment');
        return res.status(500).json({ 
          success: false, 
          error: 'Server configuration error: Missing PAT token' 
        });
      }
      
      authHeaders = {
        'Authorization': `Bearer ${databricksToken}`,
        'Content-Type': 'application/json'
      };
    }
    
    const response = await fetch(llmEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a retail intelligence expert. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000
        // Note: temperature removed - GPT-4.5 mini only supports default value of 1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ LLM API error:', response.status, errorText);
      throw new Error(`LLM API error: ${response.statusText}`);
    }
    
    const llmResult = await response.json();
    const generatedText = llmResult.choices[0].message.content;
    
    // Parse JSON (with sanitization for common LLM hallucinations)
    let config;
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      let jsonStr = jsonMatch ? jsonMatch[0] : generatedText;
      // Fix common LLM JSON errors: unquoted words as values
      jsonStr = jsonStr.replace(/:\s*([A-Z][a-zA-Z]+)\s*([,\}\]])/g, (match, word, delim) => {
        // Convert word-numbers to digits or wrap in quotes
        const wordNums = { Zero:0, One:1, Two:2, Three:3, Four:4, Five:5, Six:6, Seven:7, Eight:8, Nine:9, Ten:10,
          Fifteen:15, Twenty:20, TwentyFive:25, Thirty:30, ThirtyFive:35, Forty:40, FortyFive:45,
          Fifty:50, FiftyFive:55, Sixty:60, SixtyFive:65, Seventy:70, SeventyFive:75,
          Eighty:80, EightyFive:85, Ninety:90, NinetyFive:95, Hundred:100 };
        if (wordNums[word] !== undefined) return `: ${wordNums[word]}${delim}`;
        if (word === 'True' || word === 'False') return `: ${word.toLowerCase()}${delim}`;
        if (word === 'None' || word === 'Null') return `: null${delim}`;
        return `: "${word}"${delim}`;
      });
      config = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', generatedText);
      throw new Error('LLM returned invalid JSON');
    }
    
    // Validate required fields
    const required = ['vertical', 'primary_kpi', 'secondary_kpi', 'categories', 'business_challenges'];
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`LLM response missing: ${field}`);
      }
    }
    
    console.log(`✅ Step 1 complete for ${retailerName}:`, {
      vertical: config.vertical,
      categories: config.categories.length,
      challenges: config.business_challenges.length
    });
    
    res.json({
      success: true,
      config: config,
      generated_by: 'databricks_llm',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Config personalization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

// Step 2: Generate Agent Prompt (LLM-assisted template filling)
app.post('/api/generate-agent-prompt', async (req, res) => {
  try {
    const { 
      retailerName, 
      vertical, 
      primary_kpi, 
      secondary_kpi, 
      categories,
      isGeneric = false 
    } = req.body;
    
    console.log(`🤖 Step 2: Generating agent prompt for: ${retailerName || 'Generic ' + vertical}`);
    
    // If generic, use static template
    if (isGeneric) {
      const { buildAgentPromptTemplate } = await import('./lib/agentPromptTemplate.js');
      const prompt = buildAgentPromptTemplate({
        retailerName: vertical.charAt(0).toUpperCase() + vertical.slice(1) + ' Store',
        vertical,
        primaryKpi: primary_kpi,
        secondaryKpi: secondary_kpi,
        categories: categories,
        businessChallenges: []
      });
      
      return res.json({
        success: true,
        prompt: prompt,
        generated_by: 'template',
        timestamp: new Date().toISOString()
      });
    }
    
    // For specific retailers: Use LLM to enrich template
    const { buildAgentPromptTemplate } = await import('./lib/agentPromptTemplate.js');
    
    // First, generate base template
    const basePrompt = buildAgentPromptTemplate({
      retailerName,
      vertical,
      primaryKpi: primary_kpi,
      secondaryKpi: secondary_kpi,
      categories: categories,
      businessChallenges: req.body.business_challenges || []
    });
    
    // Call LLM to enhance/validate the prompt
    // Use DATABRICKS_LLM_ENDPOINT if set, otherwise construct from DATABRICKS_HOST
    const llmEndpoint = process.env.DATABRICKS_LLM_ENDPOINT || 
      `https://${process.env.DATABRICKS_HOST}/serving-endpoints/databricks-gpt-5-mini/invocations`;
    
    if (!process.env.DATABRICKS_HOST && !process.env.DATABRICKS_LLM_ENDPOINT) {
      console.error('❌ Missing DATABRICKS_HOST or DATABRICKS_LLM_ENDPOINT');
      return res.json({
        success: true,
        prompt: basePrompt,
        generated_by: 'template_fallback',
        timestamp: new Date().toISOString(),
        warning: 'LLM endpoint not configured, using base template'
      });
    }
    
    console.log(`🔗 Using LLM endpoint: ${llmEndpoint}`);
    
    const enhancementPrompt = `You are an AI prompt engineering expert. Review and enhance this agent system prompt for ${retailerName}.

**Current Prompt:**
${basePrompt}

**Your Task:**
1. Ensure the prompt accurately reflects ${retailerName}'s business model
2. Add any missing ${vertical}-specific terminology or best practices
3. Verify metric targets align with industry standards
4. Ensure tone is appropriate for ${retailerName} store managers

**Return the COMPLETE enhanced prompt (not just changes). Keep the same structure and formatting.`;

    // Get auth token (same logic as personalize endpoint)
    const isDatabricksApp = process.env.DATABRICKS_APP_PORT || process.env.DATABRICKS_RUNTIME_VERSION;
    let authHeaders;
    
    if (isDatabricksApp) {
      try {
        const tokenEndpoint = `https://${process.env.DATABRICKS_HOST}/oidc/v1/token`;
        
        const tokenResponse = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'scope': 'all-apis',
            'client_id': process.env.DATABRICKS_CLIENT_ID,
            'client_secret': process.env.DATABRICKS_CLIENT_SECRET
          })
        });
        
        if (!tokenResponse.ok) {
          console.warn('LLM enhancement failed, using base template');
          return res.json({
            success: true,
            prompt: basePrompt,
            generated_by: 'template_fallback',
            timestamp: new Date().toISOString()
          });
        }
        
        const tokenData = await tokenResponse.json();
        authHeaders = {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        };
        
      } catch (error) {
        console.warn('OAuth token failed, using base template:', error.message);
        return res.json({
          success: true,
          prompt: basePrompt,
          generated_by: 'template_fallback',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      const databricksToken = process.env.DATABRICKS_TOKEN;
      if (!databricksToken) {
        console.warn('No PAT token, using base template');
        return res.json({
          success: true,
          prompt: basePrompt,
          generated_by: 'template_fallback',
          timestamp: new Date().toISOString()
        });
      }
      
      authHeaders = {
        'Authorization': `Bearer ${databricksToken}`,
        'Content-Type': 'application/json'
      };
    }
    
    const response = await fetch(llmEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are an expert in retail operations and AI prompt engineering.' },
          { role: 'user', content: enhancementPrompt }
        ],
        max_tokens: 3000
        // Note: temperature removed - GPT-4.5 mini only supports default value of 1
      })
    });
    
    if (!response.ok) {
      console.warn('LLM enhancement failed, using base template');
      return res.json({
        success: true,
        prompt: basePrompt,
        generated_by: 'template_fallback',
        timestamp: new Date().toISOString()
      });
    }
    
    const llmResult = await response.json();
    const enhancedPrompt = llmResult.choices[0].message.content.trim();
    
    console.log(`✅ Step 2 complete - Agent prompt generated (${enhancedPrompt.length} chars)`);
    
    res.json({
      success: true,
      prompt: enhancedPrompt,
      generated_by: 'llm_enhanced',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Agent prompt generation error:', error);
    
    // Fallback to template on error
    try {
      const { buildAgentPromptTemplate } = await import('./lib/agentPromptTemplate.js');
      const fallbackPrompt = buildAgentPromptTemplate({
        retailerName: req.body.retailerName || 'Store',
        vertical: req.body.vertical || 'general_retail',
        primaryKpi: req.body.primary_kpi,
        secondaryKpi: req.body.secondary_kpi,
        categories: req.body.categories,
        businessChallenges: []
      });
      
      res.json({
        success: true,
        prompt: fallbackPrompt,
        generated_by: 'template_error_fallback',
        timestamp: new Date().toISOString(),
        warning: 'LLM generation failed, using template'
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        success: false, 
        error: error.message
      });
    }
  }
});

// Serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle React Router (catch all) - must come after API routes
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Databricks Apps requirement: Graceful shutdown handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Retail Intelligence Platform running on 0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Dashboard: http://localhost:${PORT}`);
  console.log(`🏬 Multi-tenant retail demo platform ready`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  if (dbClient) {
    try {
      await dbClient.close();
      console.log('✅ Databricks connection closed');
    } catch (error) {
      console.error('❌ Error closing Databricks connection:', error.message);
    }
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  if (dbClient) {
    try {
      await dbClient.close();
      console.log('✅ Databricks connection closed');
    } catch (error) {
      console.error('❌ Error closing Databricks connection:', error.message);
    }
  }
  process.exit(0);
});

// Databricks Apps requirement: Handle SIGTERM gracefully (15 second limit)
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force shutdown after 14 seconds (before 15 second limit)
  setTimeout(() => {
    console.log('Force closing server after timeout');
    process.exit(1);
  }, 14000);
});