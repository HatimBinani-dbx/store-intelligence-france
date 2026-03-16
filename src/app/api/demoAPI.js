/**
 * Demo CRUD API - Lakebase Postgres Integration
 * 
 * Handles demo configuration stored in Lakebase Postgres (OLTP)
 * Store data queries go to Delta Lake (OLAP)
 */

import { queryLakebasePostgres } from '../lib/lakebasePostgres.js';

/**
 * Get all demos (optionally filter by user)
 * @param {string} userId - Optional user ID to filter demos
 * @param {boolean} publicOnly - Only return public demos
 */
export async function getAllDemos(userId = null, publicOnly = false) {
  let query = `
    SELECT 
      d.demo_id,
      d.demo_name,
      d.demo_slug,
      d.owner_user_id,
      d.is_public,
      d.status,
      d.created_at,
      d.updated_at,
      d.last_accessed,
      b.display_name,
      b.tagline,
      b.vertical,
      b.logo_type,
      b.logo_text,
      b.logo_path,
      b.primary_color,
      b.secondary_color,
      s.footprint_type,
      s.vertical as store_vertical,
      s.store_count,
      s.data_source
    FROM demos d
    JOIN demo_branding b ON d.demo_id = b.demo_id
    JOIN demo_store_data s ON d.demo_id = s.demo_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (userId) {
    params.push(userId);
    query += ` AND d.owner_user_id = $${params.length}`;
  }
  
  if (publicOnly) {
    query += ` AND d.is_public = true`;
  }
  
  query += ` ORDER BY d.last_accessed DESC NULLS LAST, d.created_at DESC`;
  
  return await queryLakebasePostgres(query, params);
}

/**
 * Get a specific demo by ID
 * @param {string} demoId - Demo ID
 */
export async function getDemoById(demoId) {
  const demos = await queryLakebasePostgres(`
    SELECT 
      d.*,
      b.display_name,
      b.tagline,
      b.vertical,
      b.logo_type,
      b.logo_text,
      b.logo_path,
      b.primary_color,
      b.secondary_color,
      b.accent_color,
      b.header_bg_color,
      b.header_text_color,
      b.header_border_color,
      s.data_source,
      s.footprint_type,
      s.vertical as store_vertical,
      s.store_count,
      s.table_name,
      s.geography_json,
      s.data_generated_at,
      a.agent_name,
      a.agent_role,
      a.system_prompt,
      a.model_endpoint,
      a.temperature
    FROM demos d
    JOIN demo_branding b ON d.demo_id = b.demo_id
    JOIN demo_store_data s ON d.demo_id = s.demo_id
    LEFT JOIN demo_agent_config a ON d.demo_id = a.demo_id
    WHERE d.demo_id = $1
  `, [demoId]);
  
  if (demos.length === 0) {
    return null;
  }
  
  const demo = demos[0];
  
  // Get metrics
  const metrics = await queryLakebasePostgres(`
    SELECT 
      metric_type,
      name,
      display_name,
      description,
      unit,
      format_string,
      target_optimal,
      target_attention,
      target_priority,
      color_optimal,
      color_attention,
      color_priority,
      sort_order
    FROM demo_metrics
    WHERE demo_id = $1
    ORDER BY sort_order, metric_id
  `, [demoId]);
  
  return {
    ...demo,
    metrics
  };
}

/**
 * Get demo by slug (for URL-friendly access)
 * @param {string} slug - Demo slug
 */
export async function getDemoBySlug(slug) {
  const demos = await queryLakebasePostgres(`
    SELECT demo_id FROM demos WHERE demo_slug = $1
  `, [slug]);
  
  if (demos.length === 0) {
    return null;
  }
  
  return await getDemoById(demos[0].demo_id);
}

/**
 * Update demo access timestamp
 * @param {string} demoId - Demo ID
 */
export async function updateDemoAccess(demoId) {
  await queryLakebasePostgres(`
    UPDATE demos 
    SET last_accessed = CURRENT_TIMESTAMP 
    WHERE demo_id = $1
  `, [demoId]);
}

/**
 * Update demo status
 * @param {string} demoId - Demo ID
 * @param {string} status - New status ('active', 'archived', 'draft')
 */
export async function updateDemoStatus(demoId, status) {
  await queryLakebasePostgres(`
    UPDATE demos 
    SET status = $2, updated_at = CURRENT_TIMESTAMP 
    WHERE demo_id = $1
  `, [demoId, status]);
}

/**
 * Delete a demo (CASCADE will delete all related records)
 * @param {string} demoId - Demo ID
 */
export async function deleteDemo(demoId) {
  await queryLakebasePostgres(`
    DELETE FROM demos WHERE demo_id = $1
  `, [demoId]);
}

/**
 * Get retailer directory
 * @param {boolean} ingestedOnly - Only return retailers with data ingested
 */
export async function getRetailers(ingestedOnly = false) {
  let query = `
    SELECT 
      retailer_id,
      retailer_name,
      display_name,
      vertical,
      store_count,
      has_been_ingested,
      table_name,
      country,
      geojson_filename
    FROM retailer_directory
    WHERE 1=1
  `;
  
  if (ingestedOnly) {
    query += ` AND has_been_ingested = true`;
  }
  
  query += ` ORDER BY store_count DESC`;
  
  return await queryLakebasePostgres(query);
}

/**
 * Track user login
 * @param {string} userId - User ID (email)
 */
export async function trackUserLogin(userId) {
  const result = await queryLakebasePostgres(`
    INSERT INTO users (user_id, email, first_login, last_login, login_count)
    VALUES ($1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      last_login = CURRENT_TIMESTAMP,
      login_count = users.login_count + 1
    RETURNING user_id, login_count, first_login, last_login
  `, [userId]);
  
  return result[0];
}

/**
 * Verify demo_store_data schema allows NULL table_name
 */
async function verifyStoreDataSchema() {
  try {
    const result = await queryLakebasePostgres(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'demo_store_data'
      AND column_name = 'table_name'
    `);
    
    if (result.length === 0) {
      console.warn('⚠️  Could not verify demo_store_data schema');
      return false;
    }
    
    const isNullable = result[0].is_nullable === 'YES';
    console.log(`🔍 Schema check: demo_store_data.table_name is_nullable = ${result[0].is_nullable}`);
    
    if (!isNullable) {
      console.error('❌ SCHEMA ERROR: table_name column is NOT NULL but should be nullable!');
      console.error('   Run this SQL in Databricks SQL Editor:');
      console.error('   ALTER TABLE demo_store_data ALTER COLUMN table_name DROP NOT NULL;');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to verify schema:', error.message);
    return false;
  }
}

/**
 * Create a new demo
 * @param {object} demoData - Demo configuration
 * @returns {Promise<object>} Created demo object
 */
export async function createDemo(demoData) {
  // Verify schema before attempting to create
  console.log('🔍 Verifying database schema...');
  const schemaOk = await verifyStoreDataSchema();
  if (!schemaOk) {
    throw new Error('Database schema needs to be updated. See console for SQL command.');
  }
  console.log('✅ Schema verification passed');
  
  const { transaction } = await import('../lib/lakebasePostgres.js');
  
  // Use a transaction to ensure all tables are updated atomically
  return await transaction(async (client) => {
    // Generate unique IDs
    const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const demoSlug = demoData.demo_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // 0. Ensure user exists (upsert)
    const userId = demoData.owner_user_id || 'system';
    await client.query(`
      INSERT INTO users (user_id, email, first_login, last_login, login_count)
      VALUES ($1, $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        last_login = CURRENT_TIMESTAMP,
        login_count = users.login_count + 1
    `, [userId]);
    
    // 1. Insert demo record
    const demoResult = await client.query(`
      INSERT INTO demos (
        demo_id, owner_user_id, demo_name, demo_slug, is_public, status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, [
      demoId,
      demoData.owner_user_id || 'system',
      demoData.demo_name,
      demoSlug,
      demoData.is_public
    ]);
    
    const demo = demoResult.rows[0];
    
    // 2. Insert branding
    const branding = demoData.branding || {};
    await client.query(`
      INSERT INTO demo_branding (
        demo_id, display_name, tagline, vertical, logo_type, logo_text, logo_path,
        primary_color, secondary_color, accent_color,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      demoId,
      branding.display_name || demoData.demo_name,
      branding.tagline || null,
      branding.vertical || 'retail',
      branding.logo_type || 'text',
      branding.logo_text || null,
      branding.logo_path || null,
      branding.primary_color || '#000000',
      branding.secondary_color || '#666666',
      branding.accent_color || null
    ]);
    
    // 3. Insert store data metadata
    const storeData = demoData.store_data || {};
    const storeDataParams = [
      demoId,
      storeData.data_source || 'synthetic',
      storeData.footprint_type || 'nationwide',  // Changed from retailer_name
      storeData.store_count || 0,
      storeData.table_name || null,
      storeData.geography_json || null,
      storeData.vertical || branding.vertical || 'general_retail'  // Added vertical
    ];
    
    console.log('📦 Inserting store data:', {
      demo_id: demoId,
      data_source: storeDataParams[1],
      footprint_type: storeDataParams[2],
      store_count: storeDataParams[3],
      table_name: storeDataParams[4],
      geography_json: storeDataParams[5],
      vertical: storeDataParams[6]
    });
    
    await client.query(`
      INSERT INTO demo_store_data (
        demo_id, data_source, footprint_type, store_count, table_name, geography_json, vertical,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, storeDataParams);
    
    // 4. Insert metrics
    const metrics = demoData.metrics || {};
    if (metrics.primary_kpi) {
      await client.query(`
        INSERT INTO demo_metrics (
          demo_id, metric_type, name, display_name, description,
          unit, format_string, target_optimal, target_attention, target_priority,
          created_at, updated_at
        ) VALUES (
          $1, 'primary', $2, $3, $4, $5, $6, $7, $8, $9,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        demoId,
        metrics.primary_kpi.name || 'performance',
        metrics.primary_kpi.display_name || 'Store Performance',
        metrics.primary_kpi.description || null,
        metrics.primary_kpi.unit || 'percentage',
        metrics.primary_kpi.format_string || '{value}%',
        metrics.primary_kpi.targets?.optimal || 93,
        metrics.primary_kpi.targets?.attention || 92,
        metrics.primary_kpi.targets?.priority || 90
      ]);
    }
    
    if (metrics.secondary_kpi) {
      await client.query(`
        INSERT INTO demo_metrics (
          demo_id, metric_type, name, display_name, description,
          unit, format_string, target_optimal,
          created_at, updated_at
        ) VALUES (
          $1, 'secondary', $2, $3, $4, $5, $6, $7,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        demoId,
        metrics.secondary_kpi.name || 'days_of_supply',
        metrics.secondary_kpi.display_name || 'Days of Supply',
        metrics.secondary_kpi.description || null,
        metrics.secondary_kpi.unit || 'days',
        metrics.secondary_kpi.format_string || '{value} days',
        metrics.secondary_kpi.target || 60
      ]);
    }
    
    // Insert category metrics
    // Note: Categories are stored as 'additional' metrics with basic info
    // Extended category data (priority, seasonality, DOS targets) stored in description as JSON
    if (metrics.categories && Array.isArray(metrics.categories)) {
      for (let i = 0; i < metrics.categories.length; i++) {
        const cat = metrics.categories[i];
        
        // Build category metadata JSON for description field
        const categoryMeta = {
          priority: cat.priority || 'medium',
          seasonality: cat.seasonality || 'medium',
          dos_target: cat.dosTarget || cat.dos_target || 45,
          performance_target: cat.ssisTarget || cat.performance_target || 90
        };
        
        await client.query(`
          INSERT INTO demo_metrics (
            demo_id, metric_type, name, display_name, description,
            unit, format_string, target_optimal, sort_order,
            created_at, updated_at
          ) VALUES (
            $1, 'additional', $2, $3, $4, $5, $6, $7, $8,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          demoId,
          cat.id || `category_${i + 1}`,
          cat.displayName || `Category ${i + 1}`,
          JSON.stringify(categoryMeta), // Store extended data as JSON
          'percentage',
          '{value}%',
          cat.ssisTarget || cat.performance_target || 90, // Use performance target as optimal
          i // Sort order
        ]);
      }
    }
    
    // 5. Insert agent configuration
    const agentConfig = demoData.agent_config || {};
    
    // Get fallback template if needed
    let systemPrompt = demoData.agentPrompt || agentConfig.system_prompt;
    let baseTemplate = null;
    let generatedBy = demoData.isLlmGenerated ? 'llm_enhanced' : 'manual';
    
    if (!systemPrompt) {
      // Load default template from agent_prompt_templates
      try {
        const templateResult = await client.query(
          'SELECT base_prompt FROM agent_prompt_templates WHERE vertical = $1',
          [branding.vertical || 'general_retail']
        );
        systemPrompt = templateResult.rows[0]?.base_prompt || 'You are a Store Intelligence Agent specializing in retail operations.';
        baseTemplate = systemPrompt;
        generatedBy = 'template';
      } catch (templateError) {
        console.warn('Failed to load template, using generic prompt:', templateError.message);
        systemPrompt = 'You are a Store Intelligence Agent specializing in retail operations.';
        baseTemplate = systemPrompt;
        generatedBy = 'template_fallback';
      }
    }
    
    // Insert agent config with existing schema columns only
    // Note: generated_by, generation_timestamp, base_template will be added after running migration
    const vertical = branding.vertical || storeData.vertical || 'general_retail';
    const verticalDisplay = vertical.charAt(0).toUpperCase() + vertical.slice(1).replace(/_/g, ' ');
    
    await client.query(`
      INSERT INTO demo_agent_config (
        demo_id, agent_name, agent_role, system_prompt, 
        expertise_areas, terminology, model_endpoint,
        temperature, max_tokens, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      demoId,
      `${demoData.displayName || branding.display_name || 'Store'} Intelligence Agent`,
      `${verticalDisplay} Retail Operations Advisor`,
      systemPrompt,
      JSON.stringify(agentConfig.expertise_areas || []),
      JSON.stringify({ generatedBy, timestamp: new Date().toISOString() }), // Store metadata in terminology as JSON
      agentConfig.model_endpoint || 'databricks-meta-llama-3-3-70b-instruct',
      agentConfig.temperature || 0.7,
      agentConfig.max_tokens || 2000
    ]);
    
    // 6. Return full demo with all related data
    const fullDemoResult = await client.query(`
      SELECT 
        d.*,
        b.display_name, b.tagline, b.vertical, b.logo_type, b.logo_text, b.logo_path,
        b.primary_color, b.secondary_color, b.accent_color,
        s.data_source, s.footprint_type, s.vertical as store_vertical, s.store_count, s.table_name, s.geography_json
      FROM demos d
      JOIN demo_branding b ON d.demo_id = b.demo_id
      JOIN demo_store_data s ON d.demo_id = s.demo_id
      WHERE d.demo_id = $1
    `, [demoId]);
    
    return fullDemoResult.rows[0];
  });
}

