/**
 * Databricks SQL Connection Module
 * Handles connections to Databricks SQL Warehouse for querying Unity Catalog tables
 */

const { DBSQLClient } = require('@databricks/sql');

let sqlClient = null;

/**
 * Initialize Databricks SQL client
 * Uses environment variables or Databricks App context
 */
function initializeDatabricksSQL() {
  if (sqlClient) {
    return sqlClient;
  }

  const config = {
    host: process.env.DATABRICKS_SERVER_HOSTNAME,
    path: process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_TOKEN,
  };

  // Validate configuration
  if (!config.host || !config.path) {
    console.warn('⚠️ Databricks SQL configuration incomplete. Running in mock mode.');
    return createMockSQLClient();
  }

  console.log(`✅ Initializing Databricks SQL connection to ${config.host}`);
  
  sqlClient = {
    client: new DBSQLClient(),
    config: config,
    
    /**
     * Execute a SQL statement (INSERT, UPDATE, DELETE, MERGE)
     * @param {string} sql - SQL statement
     * @param {Object} params - Named parameters
     */
    async execute(sql, params = {}) {
      const connection = await this.client.connect(this.config);
      const session = await connection.openSession();
      
      try {
        const query = await session.executeStatement(sql, {
          namedParameters: params,
          runAsync: false,
        });
        
        await query.close();
        console.log(`✅ SQL executed successfully`);
      } finally {
        await session.close();
        await connection.close();
      }
    },
    
    /**
     * Query SQL and return results (SELECT)
     * @param {string} sql - SQL query
     * @param {Object} params - Named parameters
     * @returns {Promise<Array>} Query results
     */
    async query(sql, params = {}) {
      const connection = await this.client.connect(this.config);
      const session = await connection.openSession();
      
      try {
        const query = await session.executeStatement(sql, {
          namedParameters: params,
          runAsync: false,
        });
        
        const result = await query.fetchAll();
        await query.close();
        
        console.log(`✅ SQL query returned ${result.length} rows`);
        return result;
      } finally {
        await session.close();
        await connection.close();
      }
    },
    
    /**
     * Test connection to Databricks SQL Warehouse
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
      try {
        const result = await this.query('SELECT 1 as test');
        return result.length === 1 && result[0].test === 1;
      } catch (error) {
        console.error('❌ Databricks SQL connection test failed:', error.message);
        return false;
      }
    }
  };

  return sqlClient;
}

/**
 * Create a mock SQL client for development without Databricks connection
 */
function createMockSQLClient() {
  console.log('⚠️ Using mock SQL client for development');
  
  return {
    async execute(sql, params = {}) {
      console.log('🔵 MOCK SQL EXECUTE:', sql.substring(0, 100) + '...');
      console.log('   Parameters:', params);
    },
    
    async query(sql, params = {}) {
      console.log('🔵 MOCK SQL QUERY:', sql.substring(0, 100) + '...');
      console.log('   Parameters:', params);
      
      // Return mock data based on query
      if (sql.includes('FROM retail_consumer_goods.demo_platform.users')) {
        return [{
          user_id: 'mock_user@databricks.com',
          email: 'mock_user@databricks.com',
          first_login: new Date().toISOString(),
          last_login: new Date().toISOString(),
          login_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }];
      }
      
      if (sql.includes('FROM retail_consumer_goods.demo_platform.demos')) {
        return [{
          demo_id: 'mock-demo-001',
          demo_name: 'Mock Demo',
          owner_user_id: 'mock_user@databricks.com',
          status: 'active'
        }];
      }
      
      return [];
    },
    
    async testConnection() {
      console.log('🔵 MOCK connection test (always returns true)');
      return true;
    }
  };
}

/**
 * Get or initialize the Databricks SQL client
 * @returns {Object} SQL client with execute() and query() methods
 */
function getDatabricksSQL() {
  if (!sqlClient) {
    return initializeDatabricksSQL();
  }
  return sqlClient;
}

module.exports = {
  getDatabricksSQL,
  initializeDatabricksSQL
};

