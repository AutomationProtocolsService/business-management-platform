import fs from 'fs';
import path from 'path';
import { runMigrations, generateSessionMigration, generateUserSessionMigration } from './db-migrations';

/**
 * Ensures the required migration files exist
 */
async function ensureMigrationFilesExist() {
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('Created migrations directory');
  }
  
  // Check if session table migration exists
  const sessionMigrationExists = fs.existsSync(path.join(migrationsDir, '001_create_sessions_table.sql'));
  if (!sessionMigrationExists) {
    generateSessionMigration();
    console.log('Created session table migration');
  }
  
  // Check if user session link migration exists
  const userSessionMigrationExists = fs.existsSync(path.join(migrationsDir, '002_add_user_session_link.sql'));
  if (!userSessionMigrationExists) {
    generateUserSessionMigration();
    console.log('Created user session link migration');
  }
}

/**
 * Initializes the database and runs any pending migrations
 */
export async function initializeDatabaseAndMigrations(): Promise<void> {
  try {
    console.log('Initializing database and migrations...');
    
    // Ensure migration files exist
    await ensureMigrationFilesExist();
    
    // Run migrations
    await runMigrations();
    
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}