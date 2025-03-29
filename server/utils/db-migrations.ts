import fs from 'fs';
import path from 'path';
import { db, client } from '../db';

/**
 * Create migration table if it doesn't exist
 */
async function ensureMigrationsTable() {
  try {
    const result = await client`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL DEFAULT true,
        rollback_sql TEXT,
        checksum VARCHAR(64)
      );
    `;
    console.log('Migration table created or confirmed');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  try {
    const result = await client`SELECT name FROM migrations WHERE success = true ORDER BY id ASC`;
    return result.map((row: any) => row.name);
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

/**
 * Get list of available migration files
 */
function getAvailableMigrations() {
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort(); // Ensure files are processed in alphabetical order
}

/**
 * Apply a single migration
 */
async function applyMigration(migrationName: string) {
  console.log(`Applying migration: ${migrationName}`);
  const migrationPath = path.join(process.cwd(), 'server', 'migrations', migrationName);
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    // Use proper transaction API
    await client.begin(async (tx) => {
      // Execute migration SQL
      await tx.unsafe(sqlContent);
      
      // Record migration
      await tx`
        INSERT INTO migrations (name) 
        VALUES (${migrationName})
        ON CONFLICT (name) DO NOTHING
      `;
    });
    
    console.log(`Migration applied successfully: ${migrationName}`);
    return true;
  } catch (error) {
    console.error(`Error applying migration ${migrationName}:`, error);
    
    // Record failed migration
    try {
      await client`
        INSERT INTO migrations (name, success) 
        VALUES (${migrationName}, false)
        ON CONFLICT (name) DO UPDATE SET success = false, executed_at = CURRENT_TIMESTAMP
      `;
    } catch (innerError) {
      console.error('Error recording failed migration:', innerError);
    }
    
    return false;
  }
}

/**
 * Run pending migrations
 */
export async function runMigrations() {
  try {
    await ensureMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = getAvailableMigrations();
    
    let appliedCount = 0;
    let failedCount = 0;
    
    for (const migrationFile of availableMigrations) {
      if (!appliedMigrations.includes(migrationFile)) {
        const success = await applyMigration(migrationFile);
        if (success) {
          appliedCount++;
        } else {
          failedCount++;
        }
      }
    }
    
    if (appliedCount > 0 || failedCount > 0) {
      console.log(`Migration complete: ${appliedCount} applied, ${failedCount} failed`);
    } else {
      console.log('No new migrations to apply');
    }
    
    return { appliedCount, failedCount };
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

/**
 * Create a new migration file
 */
export function createMigration(name: string) {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const safeName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const fileName = `${timestamp}_${safeName}.sql`;
  
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const filePath = path.join(migrationsDir, fileName);
  
  // Create migration file with header
  const content = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- Write your SQL statements here

`;
  
  fs.writeFileSync(filePath, content);
  console.log(`Created migration file: ${fileName}`);
  return filePath;
}

/**
 * Generate a migration for session management
 */
export function generateSessionMigration() {
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const filePath = path.join(migrationsDir, '001_create_sessions_table.sql');
  
  const content = `-- Migration: Create sessions table
-- Created at: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  "user_id" integer
);

CREATE INDEX IF NOT EXISTS "sessions_expire_idx" ON "sessions" ("expire");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");`;
  
  fs.writeFileSync(filePath, content);
  console.log('Created session migration file');
  return filePath;
}

/**
 * Add a user ID column to the sessions table
 */
export function generateUserSessionMigration() {
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const filePath = path.join(migrationsDir, '002_add_user_session_link.sql');
  
  const content = `-- Migration: Add user_id to sessions table
-- Created at: ${new Date().toISOString()}

-- Check if the column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE "sessions" ADD COLUMN "user_id" integer;
        CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
    END IF;
END $$;`;
  
  fs.writeFileSync(filePath, content);
  console.log('Created user session link migration file');
  return filePath;
}