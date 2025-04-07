/**
 * Run database migration utility
 * Used to apply all pending migrations
 */
import fs from 'fs';
import path from 'path';
import { client, db } from './db';

async function ensureMigrationsTable() {
  try {
    const result = await client`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL DEFAULT true
      );
    `;
    console.log('Migration table created or confirmed');
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

async function getAppliedMigrations() {
  try {
    const result = await client`SELECT name FROM migrations WHERE success = true ORDER BY id ASC`;
    return result.map((row: any) => row.name);
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

async function logMigration(name: string, success: boolean) {
  try {
    await client`
      INSERT INTO migrations (name, success)
      VALUES (${name}, ${success})
      ON CONFLICT (name) DO UPDATE
      SET success = ${success}, executed_at = CURRENT_TIMESTAMP
    `;
  } catch (error) {
    console.error(`Error logging migration ${name}:`, error);
  }
}

async function runMigrations() {
  console.log('Initializing database migrations...');
  
  // Ensure migrations table exists
  await ensureMigrationsTable();
  
  // Get list of applied migrations
  const appliedMigrations = await getAppliedMigrations();
  console.log('Applied migrations:', appliedMigrations);
  
  // Get list of available migration files
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return { appliedCount: 0, failedCount: 0 };
  }
  
  let appliedCount = 0;
  let failedCount = 0;
  
  // Process each migration file
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') || file.endsWith('.js') || file.endsWith('.ts'))
    .sort(); // Ensure files are processed in name order
  
  for (const file of migrationFiles) {
    if (!appliedMigrations.includes(file)) {
      console.log(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      
      try {
        if (file.endsWith('.sql')) {
          // SQL migration
          const sqlContent = fs.readFileSync(filePath, 'utf8');
          await client.unsafe(sqlContent);
        }
        
        // Log successful migration
        await logMigration(file, true);
        console.log(`Migration applied successfully: ${file}`);
        appliedCount++;
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error);
        await logMigration(file, false);
        failedCount++;
      }
    } else {
      console.log(`Skipping already applied migration: ${file}`);
    }
  }
  
  console.log(`Migration complete: ${appliedCount} applied, ${failedCount} failed`);
  return { appliedCount, failedCount };
}

// Run the migrations
runMigrations()
  .then(() => {
    console.log('Database migrations completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running migrations:', error);
    process.exit(1);
  });