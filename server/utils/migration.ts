/**
 * Database Migration Utilities
 * Provides tools for managing schema migrations and data transformations
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { client, db } from '../db';
import { sql } from 'drizzle-orm';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type MigrationLogEntry = {
  id: number;
  name: string;
  appliedAt: Date;
  success: boolean;
};

// Schema for the migrations table
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Ensures the migrations table exists
 */
export const initMigrationsTable = async (): Promise<void> => {
  // Check if migrations table exists
  try {
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
        success BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    console.log(`Migrations table "${MIGRATIONS_TABLE}" is ready.`);
  } catch (error) {
    console.error('Failed to initialize migrations table:', error);
    throw error;
  }
};

/**
 * Gets a list of all applied migrations
 */
export const getAppliedMigrations = async (): Promise<string[]> => {
  try {
    const result = await client.unsafe<MigrationLogEntry[]>(`
      SELECT name FROM ${MIGRATIONS_TABLE} 
      WHERE success = TRUE 
      ORDER BY id ASC
    `);
    return result.map((row) => row.name);
  } catch (error) {
    console.error('Failed to get applied migrations:', error);
    return [];
  }
};

/**
 * Logs a migration
 */
export const logMigration = async (name: string, success: boolean): Promise<void> => {
  try {
    await client.unsafe(`
      INSERT INTO ${MIGRATIONS_TABLE} (name, applied_at, success)
      VALUES ($1, NOW(), $2)
      ON CONFLICT (name) DO UPDATE 
      SET applied_at = NOW(), success = $2
    `, [name, success]);
  } catch (error) {
    console.error(`Failed to log migration ${name}:`, error);
    throw error;
  }
};

/**
 * Runs pending migrations
 * @param migrationsDir Directory containing migration files
 */
export const runMigrations = async (migrationsDir: string = path.join(__dirname, '../migrations')): Promise<void> => {
  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log(`Created migrations directory: ${migrationsDir}`);
  }

  // Ensure migrations table exists
  await initMigrationsTable();

  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();

  // Get all migration files
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') || file.endsWith('.js') || file.endsWith('.ts'))
    .sort();

  // Run each migration that hasn't been applied yet
  for (const file of migrationFiles) {
    if (!appliedMigrations.includes(file)) {
      try {
        const filePath = path.join(migrationsDir, file);
        console.log(`Applying migration: ${file}`);

        if (file.endsWith('.sql')) {
          // SQL migration
          const sqlContent = fs.readFileSync(filePath, 'utf8');
          await client.unsafe(sqlContent);
        } else {
          // JavaScript/TypeScript migration using dynamic import for ESM compatibility
          try {
            // Converting file path to URL format for dynamic import
            const fileUrl = `file://${filePath}`;
            const migration = await import(fileUrl);
            
            if (typeof migration.up === 'function') {
              await migration.up(db, sql);
            } else if (migration.default && typeof migration.default.up === 'function') {
              // Handle ES modules with default export
              await migration.default.up(db, sql);
            } else {
              throw new Error(`Migration ${file} does not export an 'up' function.`);
            }
          } catch (importError) {
            console.error(`Error importing migration file ${file}:`, importError);
            throw importError;
          }
        }

        // Log successful migration
        await logMigration(file, true);
        console.log(`Successfully applied migration: ${file}`);
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error);
        await logMigration(file, false);
        throw error;
      }
    } else {
      console.log(`Skipping already applied migration: ${file}`);
    }
  }

  console.log('All migrations completed successfully!');
};

/**
 * Create a new migration file
 * @param name Migration name
 * @param type Type of migration ('sql' or 'js')
 */
export const createMigration = (name: string, type: 'sql' | 'js' = 'sql'): string => {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
  const fileName = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.${type}`;
  const migrationsDir = path.join(__dirname, '../migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const filePath = path.join(migrationsDir, fileName);
  
  if (type === 'sql') {
    // Create SQL migration template
    fs.writeFileSync(
      filePath,
      `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n-- Write your SQL queries here\n\n`
    );
  } else {
    // Create ESM-compatible JS migration template
    fs.writeFileSync(
      filePath,
      `// Migration: ${name}\n// Created at: ${new Date().toISOString()}\n\n/**\n * Apply the migration\n * @param db The database instance\n * @param sql SQL helper\n */\nexport const up = async (db, sql) => {\n  // Write your migration code here\n};\n\n/**\n * Revert the migration\n * @param db The database instance\n * @param sql SQL helper\n */\nexport const down = async (db, sql) => {\n  // Write your rollback code here\n};\n`
    );
  }
  
  console.log(`Created migration file: ${filePath}`);
  return filePath;
};

/**
 * Data transformation utility
 * Helps with transforming data when schema changes
 */
export const transformData = async <T>(
  table: string,
  transformer: (row: any) => T,
  condition: string = '',
  params: any[] = []
): Promise<void> => {
  try {
    // Get data to transform
    const query = `SELECT * FROM ${table}${condition ? ` WHERE ${condition}` : ''}`;
    const rows = await client.unsafe(query, params);
    
    // Process each row
    for (const row of rows) {
      const transformedData = transformer(row);
      
      // Update with transformed data
      const updateFields = Object.entries(transformedData)
        .map(([key, _], index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const updateValues = [row.id, ...Object.values(transformedData)];
      
      await client.unsafe(
        `UPDATE ${table} SET ${updateFields} WHERE id = $1`,
        updateValues
      );
    }
    
    console.log(`Transformed ${rows.length} rows in ${table}`);
  } catch (error) {
    console.error(`Error transforming data in ${table}:`, error);
    throw error;
  }
};