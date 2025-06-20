import { logger } from "../logger";
import { client, db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Initialize the database and run migrations
 * This utility ensures the database is properly set up before the server starts
 */
import { dbManager } from "./db-connection-manager";

export async function initializeDatabaseAndMigrations() {
  logger.info("Initializing database connection...");
  
  const isConnected = await dbManager.initialize();
  
  if (isConnected) {
    try {
      // Run essential schema setup
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS _internal_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      logger.info("Database initialization complete");
      return true;
    } catch (error) {
      logger.error("Migration setup failed:", error instanceof Error ? error.message : String(error));
      return false;
    }
  } else {
    logger.warn("Database unavailable - starting in limited mode");
    return false;
  }
}