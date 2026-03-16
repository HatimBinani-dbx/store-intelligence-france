/**
 * Logo Upload and Management API
 * 
 * Handles logo file uploads to Unity Catalog Volumes using Databricks SDK
 * Note: Databricks Apps cannot access /Volumes filesystem directly
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { queryLakebasePostgres } from '../lib/lakebasePostgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Unity Catalog Volume path for logos (used with Databricks SDK, not filesystem)
const LOGO_VOLUME_PATH = '/Volumes/retail_consumer_goods/store_intelligence/logos';

// Local storage for ephemeral container storage
const LOCAL_LOGO_PATH = path.join(process.cwd(), 'public', 'uploads', 'logos');

/**
 * Configure multer for logo uploads
 * - Temporary storage in memory
 * - File validation
 * - Size limits
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory temporarily
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, SVG) are allowed'));
    }
  }
});

/**
 * Check if Databricks environment (OAuth or PAT)
 */
function isInDatabricksEnvironment() {
  // Check for OAuth (Databricks Apps) or PAT (local dev)
  const hasOAuth = !!(process.env.DATABRICKS_HOST && process.env.DATABRICKS_CLIENT_ID);
  const hasPAT = !!(process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN);
  return hasOAuth || hasPAT;
}

/**
 * Get Databricks auth token (OAuth or PAT)
 */
async function getDatabricksToken() {
  // Try OAuth first (Databricks Apps)
  if (process.env.DATABRICKS_CLIENT_ID && process.env.DATABRICKS_CLIENT_SECRET) {
    console.log('🔐 Using OAuth for Files API');
    const tokenUrl = `https://${process.env.DATABRICKS_HOST}/oidc/v1/token`;
    const credentials = Buffer.from(
      `${process.env.DATABRICKS_CLIENT_ID}:${process.env.DATABRICKS_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=all-apis'
    });

    if (!response.ok) {
      throw new Error(`Failed to get OAuth token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }
  
  // Fallback to PAT (local development)
  if (process.env.DATABRICKS_TOKEN) {
    console.log('🔐 Using PAT for Files API');
    return process.env.DATABRICKS_TOKEN;
  }
  
  throw new Error('No Databricks authentication available (need OAuth or PAT)');
}

/**
 * Generate unique filename for logo
 * Format: {demo_id}-logo-{timestamp}.{ext}
 */
function generateLogoFilename(demoId, originalFilename) {
  const timestamp = Date.now();
  const ext = path.extname(originalFilename);
  return `${demoId}-logo-${timestamp}${ext}`;
}

/**
 * Save logo file to Unity Catalog Volume using Databricks Files API
 * @param {Buffer} fileBuffer - File data
 * @param {string} filename - Target filename
 * @returns {Promise<string>} - Saved filename
 */
export async function saveLogoToVolume(fileBuffer, filename) {
  const isDatabricks = isInDatabricksEnvironment();
  
  console.log(`📂 Logo save check:`, {
    isDatabricks,
    volumePath: LOGO_VOLUME_PATH,
    localPath: LOCAL_LOGO_PATH,
    method: isDatabricks ? 'Databricks Files API' : 'local filesystem'
  });
  
  if (isDatabricks) {
    try {
      // Use Databricks Files API to upload to volume
      const token = await getDatabricksToken();
      const volumeFilePath = `${LOGO_VOLUME_PATH}/${filename}`;
      
      console.log(`✅ Using Databricks Files API to upload to: ${volumeFilePath}`);
      
      const uploadUrl = `https://${process.env.DATABRICKS_HOST}/api/2.0/fs/files${volumeFilePath}`;
      
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: fileBuffer
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Files API error (${response.status}): ${errorText}`);
      }
      
      console.log(`✅ Logo saved to Unity Catalog Volume via API: ${volumeFilePath}`);
      return filename;
      
    } catch (error) {
      console.error(`❌ Error uploading to volume via API:`, error);
      console.log(`⚠️  Falling back to local storage`);
      // Fall through to local storage
    }
  }
  
  // Fallback to local storage (development or if API fails)
  console.log(`📁 Using local storage: ${LOCAL_LOGO_PATH}`);
  
  if (!fs.existsSync(LOCAL_LOGO_PATH)) {
    await fs.promises.mkdir(LOCAL_LOGO_PATH, { recursive: true });
    console.log(`📁 Created local logos directory`);
  }
  
  const filepath = path.join(LOCAL_LOGO_PATH, filename);
  await fs.promises.writeFile(filepath, fileBuffer);
  console.log(`✅ Logo saved to local storage: ${filepath}`);
  
  return filename;
}

/**
 * Update demo branding with new logo path
 * @param {string} demoId - Demo ID
 * @param {string} logoFilename - Logo filename (not full path)
 * @returns {Promise<void>}
 */
export async function updateDemoLogo(demoId, logoFilename) {
  try {
    await queryLakebasePostgres(`
      UPDATE demo_branding
      SET 
        logo_type = 'image',
        logo_path = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE demo_id = $2
    `, [logoFilename, demoId]);
    
    console.log(`✅ Updated demo ${demoId} logo to: ${logoFilename}`);
  } catch (error) {
    console.error(`❌ Error updating demo logo in database:`, error);
    throw new Error(`Failed to update logo in database: ${error.message}`);
  }
}

/**
 * Delete old logo file from volume using Databricks Files API
 * @param {string} filename - Logo filename to delete
 */
export async function deleteLogoFromVolume(filename) {
  const isDatabricks = isInDatabricksEnvironment();
  
  if (isDatabricks) {
    try {
      const token = await getDatabricksToken();
      const volumeFilePath = `${LOGO_VOLUME_PATH}/${filename}`;
      const deleteUrl = `https://${process.env.DATABRICKS_HOST}/api/2.0/fs/files${volumeFilePath}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        console.log(`✅ Deleted old logo from volume: ${filename}`);
        return;
      }
    } catch (error) {
      console.error(`⚠️  Error deleting from volume:`, error);
    }
  }
  
  // Try local storage
  const localPath = path.join(LOCAL_LOGO_PATH, filename);
  if (fs.existsSync(localPath)) {
    try {
      await fs.promises.unlink(localPath);
      console.log(`✅ Deleted old logo from local storage: ${filename}`);
    } catch (error) {
      console.error(`⚠️  Error deleting from local storage:`, error);
    }
  }
}

/**
 * Get logo file buffer from volume or local storage using Databricks Files API
 * @param {string} filename - Logo filename
 * @returns {Promise<Buffer>} - File buffer
 */
export async function getLogoBuffer(filename) {
  const isDatabricks = isInDatabricksEnvironment();
  
  if (isDatabricks) {
    try {
      // Try to download from volume using Files API
      const token = await getDatabricksToken();
      const volumeFilePath = `${LOGO_VOLUME_PATH}/${filename}`;
      const downloadUrl = `https://${process.env.DATABRICKS_HOST}/api/2.0/fs/files${volumeFilePath}`;
      
      console.log(`📥 Downloading logo from volume via API: ${volumeFilePath}`);
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        console.log(`✅ Logo downloaded from volume: ${filename}`);
        return Buffer.from(arrayBuffer);
      } else {
        console.log(`⚠️  Logo not in volume (${response.status}), checking local storage`);
      }
    } catch (error) {
      console.error(`❌ Error downloading from volume:`, error);
    }
  }
  
  // Fallback to local storage
  const localPath = path.join(LOCAL_LOGO_PATH, filename);
  if (fs.existsSync(localPath)) {
    console.log(`📂 Logo found in local storage: ${localPath}`);
    return await fs.promises.readFile(localPath);
  }
  
  throw new Error(`Logo not found: ${filename}`);
}

/**
 * Check if logo file exists in volume or local storage
 * @param {string} filename - Logo filename
 * @returns {Promise<boolean>}
 */
export async function logoExists(filename) {
  const isDatabricks = isInDatabricksEnvironment();
  
  if (isDatabricks) {
    try {
      const token = await getDatabricksToken();
      const volumeFilePath = `${LOGO_VOLUME_PATH}/${filename}`;
      const headUrl = `https://${process.env.DATABRICKS_HOST}/api/2.0/fs/files${volumeFilePath}`;
      
      const response = await fetch(headUrl, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Fall through to check local
    }
  }
  
  // Check local storage
  const localPath = path.join(LOCAL_LOGO_PATH, filename);
  return fs.existsSync(localPath);
}

// Export multer upload middleware
export const logoUploadMiddleware = upload.single('logo');

